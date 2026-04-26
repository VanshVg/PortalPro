"use client";

import { useEffect, useState } from "react";

interface UnreadMessagesBadgeProps {
  initialCount?: number;
}

/**
 * Client-side badge that shows the number of unread messages across all projects.
 *
 * - Fetches the initial count from /api/unread-count on mount so the dashboard
 *   layout doesn't have to block on a Prisma round-trip.
 * - Listens to `portalpro:msg:new` to increment when any MessagingPanel receives
 *   a new message from another user.
 * - Listens to `portalpro:msg:read` (detail: { count: N }) to decrement when the
 *   user opens the Messages tab in a project and marks messages as read.
 * - Hides completely when count reaches zero.
 */
export function UnreadMessagesBadge({ initialCount = 0 }: UnreadMessagesBadgeProps) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/unread-count", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { count: 0 }))
      .then((data: { count: number }) => {
        if (!cancelled) setCount(data.count);
      })
      .catch(() => {
        // Silent fail — badge stays at initialCount (0)
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onNew = () => setCount((c) => c + 1);
    const onRead = (e: Event) => {
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
