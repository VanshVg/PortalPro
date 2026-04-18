"use client";

import { useEffect, useState } from "react";
import { TabsTrigger } from "@portalpro/ui";
import { API_URL } from "@/lib/env";

interface MessagesTabTriggerProps {
  projectId: string;
  initialUnread: number;
}

/**
 * The "Messages" tab trigger with a real-time unread dot indicator.
 *
 * - Shows a blue dot when there are unread messages in this project.
 * - Dot clears when MessagingPanel mounts (messages loaded → mark-all-read called there),
 *   or immediately on click as a fast-path fallback.
 * - Listens to `portalpro:msg:new:<projectId>` to show the dot when a new message arrives.
 * - Listens to `portalpro:msg:read:<projectId>` (dispatched by MessagingPanel after marking
 *   read) to clear the dot without requiring a click.
 */
export function MessagesTabTrigger({ projectId, initialUnread }: MessagesTabTriggerProps) {
  const [unread, setUnread] = useState(initialUnread);

  useEffect(() => {
    const newEvent = `portalpro:msg:new:${projectId}`;
    const readEvent = `portalpro:msg:read:${projectId}`;
    const onNew = () => setUnread((c) => c + 1);
    const onRead = () => setUnread(0);
    window.addEventListener(newEvent, onNew);
    window.addEventListener(readEvent, onRead);
    return () => {
      window.removeEventListener(newEvent, onNew);
      window.removeEventListener(readEvent, onRead);
    };
  }, [projectId]);

  const handleClick = () => {
    if (unread <= 0) return;
    const prev = unread;
    setUnread(0);
    // Fast-path: mark read on click (MessagingPanel will also do it on mount,
    // but this handles the case where the panel is already mounted and the user
    // switches back to the Messages tab after receiving new messages).
    fetch(`${API_URL}/api/v1/projects/${projectId}/messages/mark-read`, {
      method: "PATCH",
      credentials: "include",
    })
      .then((res) => res.json())
      .then((json) => {
        const count: number = json.data?.count ?? prev;
        if (count > 0) {
          window.dispatchEvent(
            new CustomEvent("portalpro:msg:read", { detail: { count } }),
          );
        }
      })
      .catch(() => {
        setUnread((c) => c + prev); // restore on failure
      });
  };

  return (
    <TabsTrigger value="messages" onClick={handleClick}>
      Messages
      {unread > 0 && (
        <span className="ml-1.5 h-2 w-2 rounded-full bg-[#2E86AB] flex-shrink-0 inline-block" />
      )}
    </TabsTrigger>
  );
}
