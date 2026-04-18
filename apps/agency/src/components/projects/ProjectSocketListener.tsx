"use client";

import { useEffect } from "react";
import { useProjectSocket } from "@/hooks/useSocket";
import { activePanels } from "@/lib/active-panels";
import type { MessageResponse } from "@portalpro/types";

interface Props {
  projectId: string;
  currentUserId: string;
}

/**
 * Maintains the single Socket.io connection for a project page.
 * Always mounted (not inside any TabsContent), so it stays connected
 * regardless of which tab the user is on.
 *
 * Routing logic for incoming messages:
 * - Always dispatches `portalpro:msg:incoming:<projectId>` so MessagingPanel
 *   can update its message list when it is mounted.
 * - If the Messages tab is open (MessagingPanel is active), the panel handles
 *   the message and auto-marks it as read — no unread indicators are updated.
 * - If the Messages tab is closed, fires the unread indicator events so the
 *   tab dot and sidebar badge update without a page refresh.
 */
export function ProjectSocketListener({ projectId, currentUserId }: Props) {
  const { on } = useProjectSocket(projectId);

  useEffect(() => {
    const unsub = on<MessageResponse>("message:new", (incoming) => {
      if (incoming.threadId) {
        // It's a thread reply — forward to any open ThreadDrawer for this parent
        window.dispatchEvent(
          new CustomEvent(`portalpro:msg:reply:${incoming.threadId}`, { detail: incoming }),
        );
        // Tell the main message list to bump the parent's reply count badge in real-time
        window.dispatchEvent(
          new CustomEvent(`portalpro:msg:replycount:${projectId}`, {
            detail: { parentId: incoming.threadId },
          }),
        );
        return; // replies never touch the top-level unread dot / sidebar badge
      }

      // Top-level message — forward to MessagingPanel's message list
      window.dispatchEvent(
        new CustomEvent(`portalpro:msg:incoming:${projectId}`, { detail: incoming }),
      );

      // Only fire unread indicators when the Messages tab is NOT open
      // and the sender is someone else
      if (!activePanels.has(projectId) && incoming.author.id !== currentUserId) {
        window.dispatchEvent(new CustomEvent(`portalpro:msg:new:${projectId}`));
        window.dispatchEvent(new CustomEvent("portalpro:msg:new"));
      }
    });
    return unsub;
  }, [on, projectId, currentUserId]);

  return null;
}
