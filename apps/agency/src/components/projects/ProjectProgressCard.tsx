"use client";

import { useState, useEffect } from "react";
import { CheckSquare } from "lucide-react";
import { Card, CardContent } from "@portalpro/ui";
import type { TaskResponse } from "@portalpro/types";

interface Props {
  projectId: string;
  initialProgress: number;
  initialDoneCount: number;
  allTaskCount: number;
}

/**
 * Live progress card that updates whenever the KanbanBoard moves a task.
 * KanbanBoard dispatches `portalpro:tasks:updated:<projectId>` with the
 * current tasks array whenever its internal state changes.
 */
export function ProjectProgressCard({
  projectId,
  initialProgress,
  initialDoneCount,
  allTaskCount,
}: Props) {
  const [progress, setProgress] = useState(initialProgress);
  const [doneCount, setDoneCount] = useState(initialDoneCount);
  // allTaskCount can also change (task created/deleted) — track it too
  const [taskCount, setTaskCount] = useState(allTaskCount);

  useEffect(() => {
    const handler = (e: Event) => {
      const tasks = (e as CustomEvent<{ tasks: TaskResponse[] }>).detail.tasks;
      const done = tasks.filter((t) => t.status === "DONE").length;
      const total = tasks.length;
      setDoneCount(done);
      setTaskCount(total);
      setProgress(total === 0 ? 0 : Math.round((done / total) * 100));
    };
    const eventName = `portalpro:tasks:updated:${projectId}`;
    window.addEventListener(eventName, handler);
    return () => window.removeEventListener(eventName, handler);
  }, [projectId]);

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-neutral-400 mb-2">
          <CheckSquare className="h-4 w-4" />
          <span className="text-xs">Progress</span>
        </div>
        <div className="text-2xl font-bold text-neutral-800">{progress}%</div>
        <div className="text-xs text-neutral-400 mt-0.5">
          {doneCount}/{taskCount} tasks done
        </div>
      </CardContent>
    </Card>
  );
}
