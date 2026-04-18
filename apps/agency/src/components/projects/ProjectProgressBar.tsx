"use client";

import { useState, useEffect } from "react";
import type { TaskResponse } from "@portalpro/types";

interface Props {
  projectId: string;
  initialProgress: number;
}

/**
 * Live progress bar that updates whenever the KanbanBoard moves a task.
 * Listens to the same `portalpro:tasks:updated:<projectId>` event as
 * ProjectProgressCard so both stay in sync without any server round-trip.
 */
export function ProjectProgressBar({ projectId, initialProgress }: Props) {
  const [progress, setProgress] = useState(initialProgress);

  useEffect(() => {
    const handler = (e: Event) => {
      const tasks = (e as CustomEvent<{ tasks: TaskResponse[] }>).detail.tasks;
      const done = tasks.filter((t) => t.status === "DONE").length;
      const total = tasks.length;
      setProgress(total === 0 ? 0 : Math.round((done / total) * 100));
    };
    const eventName = `portalpro:tasks:updated:${projectId}`;
    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }, [projectId]);

  return (
    <div className="h-2 w-full rounded-full bg-neutral-100 overflow-hidden">
      <div
        className="h-full rounded-full bg-[#1B4D6E] transition-all duration-300"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
