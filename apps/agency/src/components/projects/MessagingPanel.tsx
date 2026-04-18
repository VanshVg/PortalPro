"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Reply, Loader2, MessageSquare } from "lucide-react";
import { Button, Textarea } from "@portalpro/ui";
import type { MessageResponse } from "@portalpro/types";
import { API_URL } from "@/lib/env";
import { activePanels } from "@/lib/active-panels";

// ===== API helpers =====

const OPTS = { credentials: "include" as const };

async function apiFetchMessages(
  projectId: string,
  page: number,
): Promise<{ data: MessageResponse[]; total: number }> {
  const res = await fetch(
    `${API_URL}/api/v1/projects/${projectId}/messages?page=${page}&limit=20`,
    OPTS,
  );
  if (!res.ok) throw new Error("Failed to load messages");
  return res.json();
}

async function apiSendMessage(
  projectId: string,
  content: string,
  threadId?: string,
): Promise<MessageResponse> {
  const res = await fetch(`${API_URL}/api/v1/projects/${projectId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    ...OPTS,
    body: JSON.stringify({ content, threadId }),
  });
  if (!res.ok) throw new Error("Failed to send message");
  const json = await res.json();
  return json.data as MessageResponse;
}

async function apiMarkAllRead(projectId: string): Promise<number> {
  const res = await fetch(
    `${API_URL}/api/v1/projects/${projectId}/messages/mark-read`,
    { method: "PATCH", ...OPTS },
  );
  if (!res.ok) return 0;
  const json = await res.json();
  return (json.data?.count as number) ?? 0;
}

async function apiFetchThread(
  messageId: string,
): Promise<{ parent: MessageResponse; replies: MessageResponse[] }> {
  const res = await fetch(`${API_URL}/api/v1/messages/${messageId}/thread`, OPTS);
  if (!res.ok) throw new Error("Failed to load thread");
  const json = await res.json();
  return json.data;
}

// ===== Stable-key message entry =====
//
// When an optimistic message (key = tempId) is confirmed by the server, the
// real message id changes (key = realId). React treats old/new as different
// elements, unmounts the old bubble and mounts a new one — causing a flicker.
// Keeping a stable `_key` that never changes for the lifetime of a message
// prevents that unmount/remount cycle.

type MessageEntry = MessageResponse & { _key: string };

function toEntry(msg: MessageResponse): MessageEntry {
  return { ...msg, _key: msg.id };
}

// ===== Avatar helper =====

function Avatar({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const cls =
    size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs";
  return (
    <div
      className={`${cls} rounded-full bg-[#1B4D6E] text-white font-bold flex items-center justify-center flex-shrink-0`}
    >
      {initials}
    </div>
  );
}

// ===== Message Bubble =====

interface MessageBubbleProps {
  message: MessageResponse;
  currentUserId: string;
  onReply: (message: MessageResponse) => void;
  onOpenThread: (message: MessageResponse) => void;
  isReply?: boolean;
}

function MessageBubble({
  message,
  currentUserId,
  onReply,
  onOpenThread,
  isReply = false,
}: MessageBubbleProps) {
  const isMine = message.author.id === currentUserId;
  const time = new Date(message.createdAt).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const date = new Date(message.createdAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });

  return (
    <div className={`flex gap-3 group ${isMine ? "flex-row-reverse" : ""}`}>
      <Avatar name={message.author.name} />
      <div className={`max-w-[72%] ${isMine ? "items-end" : "items-start"} flex flex-col`}>
        {/* Author + time */}
        {!isReply && (
          <div
            className={`flex items-baseline gap-2 mb-1 ${isMine ? "flex-row-reverse" : ""}`}
          >
            <span className="text-xs font-semibold text-neutral-700">
              {isMine ? "You" : message.author.name}
            </span>
            <span className="text-[10px] text-neutral-400">
              {date} · {time}
            </span>
          </div>
        )}

        {/* Message bubble */}
        <div
          className={[
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words",
            isMine
              ? "bg-[#1B4D6E] text-white rounded-tr-sm"
              : "bg-neutral-100 text-neutral-800 rounded-tl-sm",
          ].join(" ")}
        >
          {message.content}
        </div>

        {/* Thread indicator / reply action */}
        {!isReply && (
          (message.replyCount ?? 0) > 0 ? (
            /* Thread exists — always show "View thread" */
            <div className={`flex mt-1 ${isMine ? "justify-end" : ""}`}>
              <button
                className="text-[10px] text-[#2E86AB] hover:text-[#1B4D6E] flex items-center gap-1 font-medium"
                onClick={() => onOpenThread(message)}
              >
                <MessageSquare className="h-3 w-3" />
                {message.replyCount} {message.replyCount === 1 ? "reply" : "replies"} · View thread
              </button>
            </div>
          ) : (
            /* No thread yet — show "Reply" on hover only */
            <div className={`flex mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${isMine ? "justify-end" : ""}`}>
              <button
                className="text-[10px] text-neutral-400 hover:text-neutral-600 flex items-center gap-0.5"
                onClick={() => onReply(message)}
              >
                <Reply className="h-3 w-3" />
                Reply
              </button>
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ===== Thread Drawer =====

interface ThreadDrawerProps {
  projectId: string;
  parentMessage: MessageResponse;
  currentUserId: string;
  currentUserName: string;
  onClose: () => void;
}

function ThreadDrawer({
  projectId,
  parentMessage,
  currentUserId,
  currentUserName,
  onClose,
}: ThreadDrawerProps) {
  const [replies, setReplies] = useState<MessageEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const pendingReplyIds = useRef<Set<string>>(new Set());

  // Initial load
  useEffect(() => {
    apiFetchThread(parentMessage.id)
      .then(({ replies: fetched }) => setReplies(fetched.map(toEntry)))
      .finally(() => setLoading(false));
  }, [parentMessage.id]);

  // Real-time replies forwarded by ProjectSocketListener
  useEffect(() => {
    const handler = (e: Event) => {
      const incoming = (e as CustomEvent<MessageResponse>).detail;
      setReplies((prev) => {
        if (prev.some((r) => r.id === incoming.id)) return prev;
        // Own reply confirmed by socket — replace optimistic temp in-place (stable key → no flicker)
        if (incoming.author.id === currentUserId && pendingReplyIds.current.size > 0) {
          const firstTempId = pendingReplyIds.current.values().next().value as string;
          pendingReplyIds.current.delete(firstTempId);
          return prev.map((r) =>
            r._key === firstTempId ? { ...incoming, _key: firstTempId } : r,
          );
        }
        return [...prev, toEntry(incoming)];
      });
    };
    const eventName = `portalpro:msg:reply:${parentMessage.id}`;
    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }, [parentMessage.id, currentUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [replies]);

  const handleSend = () => {
    if (!replyText.trim()) return;
    const text = replyText.trim();
    setReplyText("");

    // Optimistic bubble — appears instantly, replaced by real message on API response
    const tempId = `temp-reply-${Date.now()}`;
    pendingReplyIds.current.add(tempId);
    const optimistic: MessageEntry = {
      id: tempId,
      _key: tempId,
      content: text,
      author: { id: currentUserId, name: currentUserName, email: "", avatarUrl: null, locale: "", timezone: "" },
      threadId: parentMessage.id,
      isRead: true,
      replyCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setReplies((prev) => [...prev, optimistic]);

    apiSendMessage(projectId, text, parentMessage.id)
      .then((msg) => {
        pendingReplyIds.current.delete(tempId);
        setReplies((prev) => {
          // Socket may have already swapped in the real message — dedup
          if (prev.some((r) => r.id === msg.id)) return prev.filter((r) => r._key !== tempId);
          // Replace temp in-place (stable _key → no flicker)
          return prev.map((r) => (r._key === tempId ? { ...msg, _key: tempId } : r));
        });
      })
      .catch(() => {
        pendingReplyIds.current.delete(tempId);
        setReplies((prev) => prev.filter((r) => r._key !== tempId));
        setReplyText(text);
      });
  };

  return (
    <div className="border-l border-neutral-100 w-80 flex flex-col bg-neutral-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 bg-white">
        <span className="text-xs font-semibold text-neutral-700">Thread</span>
        <button
          className="text-neutral-400 hover:text-neutral-600 text-[10px]"
          onClick={onClose}
        >
          ✕ Close
        </button>
      </div>

      {/* Parent message */}
      <div className="px-4 pt-4 pb-2 border-b border-neutral-100 bg-white">
        <MessageBubble
          message={parentMessage}
          currentUserId={currentUserId}
          onReply={() => {}}
          onOpenThread={() => {}}
          isReply
        />
      </div>

      {/* Replies */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loading && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
          </div>
        )}
        {!loading && replies.length === 0 && (
          <p className="text-xs text-neutral-400 text-center py-4">No replies yet.</p>
        )}
        {replies.map((r) => (
          <MessageBubble
            key={r._key}
            message={r}
            currentUserId={currentUserId}
            onReply={() => {}}
            onOpenThread={() => {}}
            isReply
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Reply composer */}
      <div className="px-3 pb-3 pt-2 border-t border-neutral-100 bg-white">
        <div className="flex gap-2">
          <Textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Reply…"
            rows={2}
            className="flex-1 resize-none text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend();
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSend}
            disabled={!replyText.trim()}
            className="self-end"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ===== Main MessagingPanel =====

interface MessagingPanelProps {
  projectId: string;
  currentUserId: string;
  currentUserName: string;
}

export function MessagingPanel({ projectId, currentUserId, currentUserName }: MessagingPanelProps) {
  const [messages, setMessages] = useState<MessageEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [composerText, setComposerText] = useState("");
  const [activeThread, setActiveThread] = useState<MessageResponse | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  // Tracks temp IDs of in-flight optimistic messages so the incoming-message handler
  // can replace them instead of duplicating.
  const pendingTempIds = useRef<Set<string>>(new Set());

  // Register this panel as active so ProjectSocketListener skips unread-indicator events
  // while the user is looking at the Messages tab.
  useEffect(() => {
    activePanels.add(projectId);
    return () => { activePanels.delete(projectId); };
  }, [projectId]);

  // Receive messages forwarded by ProjectSocketListener via custom window events.
  // ProjectSocketListener holds the actual Socket.io connection; this panel
  // only needs to react to the messages, not maintain its own socket.
  useEffect(() => {
    const handler = (e: Event) => {
      const incoming = (e as CustomEvent<MessageResponse>).detail;
      setMessages((prev) => {
        if (prev.some((m) => m.id === incoming.id)) return prev;

        // Own message confirmed — replace optimistic temp in-place (stable _key → no flicker)
        if (incoming.author.id === currentUserId && pendingTempIds.current.size > 0) {
          const firstTempId = pendingTempIds.current.values().next().value as string;
          pendingTempIds.current.delete(firstTempId);
          setTotal((t) => t + 1);
          return prev.map((m) =>
            m._key === firstTempId ? { ...incoming, _key: firstTempId } : m,
          );
        }

        // Message from another user: panel is visible → auto-mark as read silently
        apiMarkAllRead(projectId).catch(() => {});
        setTotal((t) => t + 1);
        return [...prev, toEntry(incoming)];
      });
    };
    const eventName = `portalpro:msg:incoming:${projectId}`;
    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }, [projectId, currentUserId]);

  // Bump the reply count on the parent message bubble when a reply arrives in real-time.
  useEffect(() => {
    const handler = (e: Event) => {
      const { parentId } = (e as CustomEvent<{ parentId: string }>).detail;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === parentId ? { ...m, replyCount: (m.replyCount ?? 0) + 1 } : m,
        ),
      );
    };
    const eventName = `portalpro:msg:replycount:${projectId}`;
    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }, [projectId]);

  const loadMessages = useCallback(
    async (pg: number, append = false) => {
      if (pg === 1) setLoading(true);
      else setLoadingMore(true);
      try {
        const result = await apiFetchMessages(projectId, pg);
        // API returns newest-first; reverse for chronological display
        const ordered = [...result.data].reverse().map(toEntry);
        setMessages((prev) => (append ? [...ordered, ...prev] : ordered));
        setTotal(result.total);

        // Mark all messages as read the moment the user sees them (initial load only).
        // Always dispatch the clear events — even if 0 rows were updated (already read),
        // the user IS seeing the messages so the dot and sidebar must reflect that.
        if (pg === 1) {
          apiMarkAllRead(projectId)
            .then((count) => {
              window.dispatchEvent(new CustomEvent(`portalpro:msg:read:${projectId}`));
              if (count > 0) {
                window.dispatchEvent(
                  new CustomEvent("portalpro:msg:read", { detail: { count } }),
                );
              }
            })
            .catch(() => {
              // Even on failure, clear the dot locally — the user can see the messages.
              window.dispatchEvent(new CustomEvent(`portalpro:msg:read:${projectId}`));
            });
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [projectId],
  );

  useEffect(() => {
    loadMessages(1);
  }, [loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!composerText.trim()) return;
    const text = composerText.trim();
    setComposerText(""); // clear immediately so user can type next message

    // Add optimistic bubble right away
    const tempId = `temp-${Date.now()}`;
    pendingTempIds.current.add(tempId);
    const optimistic: MessageEntry = {
      id: tempId,
      _key: tempId,
      content: text,
      author: { id: currentUserId, name: currentUserName, email: "", avatarUrl: null, locale: "", timezone: "" },
      threadId: null,
      isRead: true,
      replyCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    // Fire API in background — replace temp when it resolves
    apiSendMessage(projectId, text)
      .then((msg) => {
        pendingTempIds.current.delete(tempId);
        setMessages((prev) => {
          // Socket may have already swapped in the real message — dedup
          if (prev.some((m) => m.id === msg.id)) return prev.filter((m) => m._key !== tempId);
          // Replace temp in-place (stable _key → no flicker)
          return prev.map((m) => (m._key === tempId ? { ...msg, _key: tempId } : m));
        });
        setTotal((t) => t + 1);
      })
      .catch(() => {
        pendingTempIds.current.delete(tempId);
        setMessages((prev) => prev.filter((m) => m._key !== tempId));
        setComposerText(text); // restore text on failure
      });
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadMessages(nextPage, true);
  };

  const hasMore = messages.length < total;

  return (
    <div className="flex h-[600px] rounded-xl border border-neutral-200 overflow-hidden bg-white">
      {/* Main thread list */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Load more */}
        {hasMore && (
          <div className="flex justify-center py-2 border-b border-neutral-100">
            <button
              className="text-xs text-[#2E86AB] hover:text-[#1B4D6E] font-medium flex items-center gap-1 disabled:opacity-50"
              onClick={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                "Load earlier messages"
              )}
            </button>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
            </div>
          )}
          {!loading && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <MessageSquare className="h-10 w-10 text-neutral-300 mb-3" />
              <p className="text-sm font-medium text-neutral-600">No messages yet</p>
              <p className="text-xs text-neutral-400 mt-1">
                Start the conversation below.
              </p>
            </div>
          )}
          {messages.map((msg) => (
            <MessageBubble
              key={msg._key}
              message={msg}
              currentUserId={currentUserId}
              onReply={setActiveThread}
              onOpenThread={setActiveThread}
            />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <div className="px-4 pb-4 pt-2 border-t border-neutral-100">
          <div className="flex gap-2 items-end">
            <Textarea
              value={composerText}
              onChange={(e) => setComposerText(e.target.value)}
              placeholder="Write a message… (⌘+Enter to send)"
              rows={2}
              className="flex-1 resize-none text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend();
              }}
            />
            <Button
              type="button"
              onClick={handleSend}
              disabled={!composerText.trim()}
              className="flex-shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Thread drawer (shown when a thread is selected) */}
      {activeThread && (
        <ThreadDrawer
          projectId={projectId}
          parentMessage={activeThread}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          onClose={() => setActiveThread(null)}
        />
      )}
    </div>
  );
}
