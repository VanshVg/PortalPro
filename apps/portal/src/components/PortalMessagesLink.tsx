"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MessageSquare, ChevronRight } from "lucide-react";
import { useProjectSocket } from "@/hooks/useSocket";
import type { MessageResponse } from "@portalpro/types";

interface Props {
  projectId: string;
  href: string;
  initialUnread: number;
  currentUserId: string;
}

/**
 * The "Project Messages" navigation link on the portal project overview page.
 * Connects to the project socket room to detect incoming messages in real-time
 * and shows an unread dot when there are messages the client hasn't read yet.
 * The dot clears immediately when the user clicks through to the messages page.
 */
export function PortalMessagesLink({ projectId, href, initialUnread, currentUserId }: Props) {
  const [unread, setUnread] = useState(initialUnread);
  const { on } = useProjectSocket(projectId);

  useEffect(() => {
    // Increment unread dot when a new top-level message arrives from someone else
    const unsub = on<MessageResponse>("message:new", (incoming) => {
      if (!incoming.threadId && incoming.author.id !== currentUserId) {
        setUnread((c) => c + 1);
      }
    });
    return unsub;
  }, [on, currentUserId]);

  return (
    <Link
      href={href}
      onClick={() => setUnread(0)}
      className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-5 py-4 hover:border-neutral-300 hover:shadow-sm transition-all"
    >
      <MessageSquare className="h-5 w-5 text-neutral-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-800">Project Messages</p>
        <p className="text-xs text-neutral-400 mt-0.5">
          View the conversation thread with your agency
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {unread > 0 && (
          <span className="h-2 w-2 rounded-full bg-[#2E86AB]" aria-label={`${unread} unread messages`} />
        )}
        <ChevronRight className="h-4 w-4 text-neutral-400" />
      </div>
    </Link>
  );
}
