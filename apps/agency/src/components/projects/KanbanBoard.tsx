"use client";

import { useState, useCallback, useTransition, useEffect, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, GripVertical, Clock, AlertTriangle, User } from "lucide-react";
import type { TaskResponse } from "@portalpro/types";
import { TaskDetailModal } from "./TaskDetailModal";
import { API_URL } from "@/lib/env";
import { useProjectSocket } from "@/hooks/useSocket";

// ===== Types =====

type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: "TODO", label: "To Do", color: "bg-neutral-200" },
  { id: "IN_PROGRESS", label: "In Progress", color: "bg-blue-200" },
  { id: "IN_REVIEW", label: "In Review", color: "bg-amber-200" },
  { id: "DONE", label: "Done", color: "bg-green-200" },
];

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: "bg-red-100 text-red-700",
  HIGH: "bg-orange-100 text-orange-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  LOW: "bg-neutral-100 text-neutral-500",
};

/** Sentinel ID for empty columns — drops on this mean "move to column" */
const sentinelId = (status: TaskStatus) => `__sentinel:${status}`;
const isSentinel = (id: string | number) => String(id).startsWith("__sentinel:");
const statusFromSentinel = (id: string | number): TaskStatus =>
  String(id).replace("__sentinel:", "") as TaskStatus;

// ===== API helpers =====

async function apiPatchTask(taskId: string, body: Record<string, unknown>) {
  const res = await fetch(`${API_URL}/api/v1/tasks/${taskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to update task");
  return res.json();
}

async function apiReorderTasks(projectId: string, orderedIds: string[]) {
  const res = await fetch(`${API_URL}/api/v1/projects/${projectId}/tasks/reorder`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ orderedIds }),
  });
  if (!res.ok) throw new Error("Failed to reorder tasks");
}

// ===== Task Card =====

interface TaskCardProps {
  task: TaskResponse;
  onOpen: (task: TaskResponse) => void;
}

function TaskCard({ task, onOpen }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const isOverdue =
    task.dueDate && task.status !== "DONE" && new Date(task.dueDate) < new Date();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white border border-neutral-100 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
      onClick={() => onOpen(task)}
    >
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 text-neutral-300 hover:text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>

        <div className="flex-1 min-w-0">
          {/* Title */}
          <p
            className={[
              "text-sm font-medium leading-snug",
              task.status === "DONE" ? "text-neutral-400 line-through" : "text-neutral-800",
            ].join(" ")}
          >
            {task.title}
          </p>

          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span
              className={[
                "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium",
                PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS["MEDIUM"]!,
              ].join(" ")}
            >
              {task.priority === "URGENT" && <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />}
              {task.priority}
            </span>

            {task.dueDate && (
              <span
                className={[
                  "inline-flex items-center gap-0.5 text-[10px]",
                  isOverdue ? "text-red-600 font-medium" : "text-neutral-400",
                ].join(" ")}
              >
                <Clock className="h-2.5 w-2.5" />
                {new Date(task.dueDate).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            )}

            {task.blockedById && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-red-500">
                <AlertTriangle className="h-2.5 w-2.5" />
                Blocked
              </span>
            )}
          </div>

          {/* Footer: assignee + comments */}
          <div className="flex items-center justify-between mt-2">
            {task.assignee ? (
              <div className="flex items-center gap-1 text-[10px] text-neutral-400">
                <User className="h-2.5 w-2.5" />
                <span className="truncate max-w-[80px]">{task.assignee.name}</span>
              </div>
            ) : (
              <span />
            )}
            {(task.commentCount ?? 0) > 0 && (
              <span className="text-[10px] text-neutral-400">
                💬 {task.commentCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Column Sentinel (drop target for empty columns) =====
// Uses useSortable but doesn't attach listeners — not draggable but still a registered drop target.

function ColumnSentinel({ status, isActive }: { status: TaskStatus; isActive: boolean }) {
  const { setNodeRef } = useSortable({ id: sentinelId(status) });
  return (
    <div
      ref={setNodeRef}
      className={[
        "flex-1 flex items-center justify-center py-6 text-xs rounded-lg border-2 border-dashed transition-colors",
        isActive
          ? "border-neutral-400 text-neutral-500 bg-neutral-100"
          : "border-neutral-200 text-neutral-400",
      ].join(" ")}
    >
      Drop tasks here
    </div>
  );
}

// ===== Kanban Column =====

interface KanbanColumnProps {
  column: (typeof COLUMNS)[number];
  tasks: TaskResponse[];
  isActive: boolean; // true when a task is being dragged over this column
  onAddTask: (status: TaskStatus) => void;
  onOpenTask: (task: TaskResponse) => void;
}

function KanbanColumn({ column, tasks, isActive, onAddTask, onOpenTask }: KanbanColumnProps) {
  // Memoize so SortableContext receives a stable array reference each render.
  // Without this, a new array is created every render → SortableContext thinks
  // items changed → measureRect setState loop → "Maximum update depth exceeded".
  const sortableIds = useMemo(
    () => tasks.length > 0 ? tasks.map((t) => t.id) : [sentinelId(column.id)],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, column.id],
  );

  return (
    <div className="flex flex-col min-w-[260px] w-[260px]">
      {/* Column header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${column.color}`} />
          <span className="text-sm font-semibold text-neutral-700">{column.label}</span>
          <span className="text-xs text-neutral-400 tabular-nums">({tasks.length})</span>
        </div>
        <button
          className="text-neutral-400 hover:text-neutral-700 transition-colors rounded p-0.5 hover:bg-neutral-100"
          onClick={() => onAddTask(column.id)}
          aria-label={`Add task to ${column.label}`}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Drop zone */}
      <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
        <div
          className={[
            "flex flex-col gap-2 min-h-[80px] rounded-xl p-2 transition-colors",
            isActive ? "bg-neutral-100 ring-2 ring-neutral-300 ring-inset" : "bg-neutral-50",
          ].join(" ")}
        >
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onOpen={onOpenTask} />
          ))}
          {tasks.length === 0 && (
            <ColumnSentinel status={column.id} isActive={isActive} />
          )}
        </div>
      </SortableContext>
    </div>
  );
}

// ===== Main KanbanBoard =====

interface KanbanBoardProps {
  projectId: string;
  initialTasks: TaskResponse[];
  userRole: string;
  members: { id: string; name: string; avatarUrl: string | null }[];
}

export function KanbanBoard({ projectId, initialTasks, userRole, members }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<TaskResponse[]>(initialTasks);
  const [activeTask, setActiveTask] = useState<TaskResponse | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskResponse | null>(null);
  const [addingToColumn, setAddingToColumn] = useState<TaskStatus | null>(null);
  const [, startTransition] = useTransition();
  const { status: socketStatus, on } = useProjectSocket(projectId);

  // Apply real-time task updates from other users
  useEffect(() => {
    const unsub = on<TaskResponse>("task:updated", (updated) => {
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    });
    return unsub;
  }, [on]);

  // Notify ProjectProgressCard and ProjectProgressBar whenever the task list changes.
  // Both components listen for this event to update their displayed values without
  // requiring a page reload.
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(`portalpro:tasks:updated:${projectId}`, { detail: { tasks } }),
    );
  }, [tasks, projectId]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const canEdit = ["OWNER", "ADMIN", "EDITOR"].includes(userRole);

  const tasksByStatus = (status: TaskStatus) =>
    tasks
      .filter((t) => t.status === status)
      .sort((a, b) => a.sortOrder - b.sortOrder);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const task = tasks.find((t) => t.id === event.active.id);
      setActiveTask(task ?? null);
    },
    [tasks],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) {
        setDragOverStatus(null);
        return;
      }

      const draggedTask = tasks.find((t) => t.id === active.id);
      if (!draggedTask) return;

      // Determine which column the cursor is over
      let targetStatus: TaskStatus | undefined;
      if (isSentinel(over.id)) {
        targetStatus = statusFromSentinel(over.id);
      } else {
        const overTask = tasks.find((t) => t.id === over.id);
        targetStatus = overTask?.status as TaskStatus | undefined;
      }

      setDragOverStatus(targetStatus ?? null);

      // Optimistically move the task to the target column (live preview)
      if (targetStatus && targetStatus !== draggedTask.status) {
        setTasks((prev) =>
          prev.map((t) => (t.id === draggedTask.id ? { ...t, status: targetStatus } : t)),
        );
      }
    },
    [tasks],
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveTask(null);
      setDragOverStatus(null);

      const { active, over } = event;

      // Rolled back — dropped outside any droppable
      if (!over) {
        setTasks(initialTasks);
        return;
      }

      const draggedTask = tasks.find((t) => t.id === active.id);
      if (!draggedTask) return;

      // Resolve target status — could be a sentinel (empty column) or a task
      let targetStatus: TaskStatus;
      let overTaskId: string | null = null;

      if (isSentinel(over.id)) {
        targetStatus = statusFromSentinel(over.id);
      } else {
        const overTask = tasks.find((t) => t.id === over.id);
        targetStatus = (overTask?.status ?? draggedTask.status) as TaskStatus;
        overTaskId = overTask?.id ?? null;
      }

      const originalTask = initialTasks.find((t) => t.id === active.id);
      const originalStatus = (originalTask?.status ?? draggedTask.status) as TaskStatus;
      const sameColumn = originalStatus === targetStatus;
      const droppingOnSelf = active.id === over.id;

      if (droppingOnSelf && sameColumn) return;

      startTransition(async () => {
        try {
          // Persist column change
          if (originalStatus !== targetStatus) {
            await apiPatchTask(String(active.id), { status: targetStatus });
          }

          // Persist reorder within same column
          if (sameColumn && overTaskId && !droppingOnSelf) {
            const columnIds = initialTasks
              .filter((t) => t.status === targetStatus)
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((t) => t.id);
            const oldIdx = columnIds.indexOf(String(active.id));
            const newIdx = columnIds.indexOf(overTaskId);
            if (oldIdx !== -1 && newIdx !== -1) {
              await apiReorderTasks(projectId, arrayMove(columnIds, oldIdx, newIdx));
            }
          }
        } catch {
          setTasks(initialTasks);
        }
      });
    },
    [tasks, projectId, initialTasks],
  );

  const handleTaskUpdated = useCallback((updated: TaskResponse) => {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setSelectedTask(updated);
  }, []);

  const handleTaskDeleted = useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setSelectedTask(null);
  }, []);

  const handleTaskCreated = useCallback((newTask: TaskResponse) => {
    setTasks((prev) => [...prev, newTask]);
    setAddingToColumn(null);
    setSelectedTask(newTask);
  }, []);

  return (
    <>
      {/* Connection status indicator */}
      <div className="flex items-center justify-end mb-2">
        <span
          className={[
            "inline-flex items-center gap-1.5 text-[10px] font-medium rounded-full px-2 py-0.5",
            socketStatus === "connected"
              ? "bg-green-100 text-green-700"
              : socketStatus === "connecting"
                ? "bg-amber-100 text-amber-700"
                : "bg-neutral-100 text-neutral-500",
          ].join(" ")}
        >
          <span
            className={[
              "h-1.5 w-1.5 rounded-full",
              socketStatus === "connected"
                ? "bg-green-500"
                : socketStatus === "connecting"
                  ? "bg-amber-500 animate-pulse"
                  : "bg-neutral-400",
            ].join(" ")}
          />
          {socketStatus === "connected"
            ? "Live"
            : socketStatus === "connecting"
              ? "Connecting…"
              : "Offline"}
        </span>
      </div>

      <div className="overflow-x-auto pb-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 w-max">
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.id}
                column={col}
                tasks={tasksByStatus(col.id)}
                isActive={activeTask !== null && dragOverStatus === col.id}
                onAddTask={canEdit ? setAddingToColumn : () => {}}
                onOpenTask={setSelectedTask}
              />
            ))}
          </div>

          {/* Drag overlay — floating card while dragging */}
          <DragOverlay>
            {activeTask && (
              <div className="rotate-2 shadow-xl">
                <TaskCard task={activeTask} onOpen={() => {}} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Task detail / create modal */}
      {(selectedTask || addingToColumn) && (
        <TaskDetailModal
          projectId={projectId}
          task={selectedTask ?? null}
          defaultStatus={addingToColumn ?? undefined}
          members={members}
          canEdit={canEdit}
          onUpdated={handleTaskUpdated}
          onDeleted={handleTaskDeleted}
          onCreated={handleTaskCreated}
          onClose={() => {
            setSelectedTask(null);
            setAddingToColumn(null);
          }}
        />
      )}
    </>
  );
}
