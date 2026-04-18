"use client";

import { useEffect, useState } from "react";

interface UnreadMessagesBadgeProps {
  initialCount: number;
}

/**
 * Client-side badge that shows the number of unread messages across all projects.
 *
 * - Starts with the server-fetched count (accurate on first render, no layout shift).
 * - Listens to `portalpro:msg:new` to increment when any MessagingPanel receives a new
 *   message from another user.
 * - Listens to `portalpro:msg:read` (detail: { count: N }) to decrement when the user
 *   opens the Messages tab in a project and marks messages as read.
 * - Hides completely when count reaches zero.
 */
export function UnreadMessagesBadge({ initialCount }: UnreadMessagesBadgeProps) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    const onNew = () => setCount((c) => c + 1);
    const onRead = (e: Event) => {
      // Use the delta from the event. If no delta is provided, reset to 0 to be safe.
      const delta = (e as CustomEvent<{ count: number }>).detail?.count;
      if (delta !== undefined) {
        setCount((c) => Math.max(0, c - delta));
      } else {
        setCount(0);
      }
    };
    window.addEventListener("portalpro:msg:new", onNew);
    window.addEventListener("portalpro:msg:read", onRead);
    return () => {
      window.removeEventListener("portalpro:msg:new", onNew);
      window.removeEventListener("portalpro:msg:read", onRead);
    };
  }, []);

  if (count <= 0) return null;

  return (
    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent text-[10px] font-bold text-neutral-900 px-1">
      {count > 99 ? "99+" : count}
    </span>
  );
}
