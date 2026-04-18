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
import {
  Plus, GripVertical, Clock, AlertTriangle, User,
  LayoutGrid, List, Search, X, ChevronUp, ChevronDown,
} from "lucide-react";
import type { TaskResponse } from "@portalpro/types";
import { TaskDetailModal } from "./TaskDetailModal";
import { API_URL } from "@/lib/env";
import { useProjectSocket } from "@/hooks/useSocket";

// ===== Types =====

type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
type SortField = "title" | "status" | "priority" | "assignee" | "dueDate" | "createdAt";

const COLUMNS: { id: TaskStatus; label: string; color: string }[] = [
  { id: "TODO", label: "To Do", color: "bg-neutral-200" },
  { id: "IN_PROGRESS", label: "In Progress", color: "bg-blue-200" },
  { id: "IN_REVIEW", label: "In Review", color: "bg-amber-200" },
  { id: "DONE", label: "Done", color: "bg-green-200" },
];

const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "Todo",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  TODO: "bg-neutral-100 text-neutral-600",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  IN_REVIEW: "bg-amber-100 text-amber-700",
  DONE: "bg-green-100 text-green-700",
};

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: "bg-red-100 text-red-700",
  HIGH: "bg-orange-100 text-orange-700",
  MEDIUM: "bg-blue-100 text-blue-700",
  LOW: "bg-neutral-100 text-neutral-500",
};

const PRIORITY_LABELS: Record<string, string> = {
  URGENT: "Urgent",
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

const STATUS_SORT_ORDER: Record<TaskStatus, number> = {
  TODO: 0,
  IN_PROGRESS: 1,
  IN_REVIEW: 2,
  DONE: 3,
};

const PRIORITY_SORT_ORDER: Record<string, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
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
            {task.number > 0 && (
              <span className="text-neutral-400 font-normal mr-1">#{task.number}</span>
            )}
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

// ===== List View =====

interface SortIconProps {
  field: SortField;
  sortField: SortField;
  sortDir: "asc" | "desc";
}

function SortIcon({ field, sortField, sortDir }: SortIconProps) {
  if (sortField !== field) return <ChevronUp className="h-3 w-3 text-neutral-300" />;
  return sortDir === "asc"
    ? <ChevronUp className="h-3 w-3 text-[#1B4D6E]" />
    : <ChevronDown className="h-3 w-3 text-[#1B4D6E]" />;
}

interface ListViewProps {
  tasks: TaskResponse[];
  sortField: SortField;
  sortDir: "asc" | "desc";
  onSort: (field: SortField) => void;
  onOpenTask: (task: TaskResponse) => void;
}

function ListView({ tasks, sortField, sortDir, onSort, onOpenTask }: ListViewProps) {
  const thClass =
    "px-3 py-2.5 text-left text-xs font-semibold text-neutral-500 cursor-pointer select-none hover:text-neutral-800 transition-colors whitespace-nowrap";

  return (
    <div className="rounded-xl border border-neutral-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 border-b border-neutral-200">
          <tr>
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-neutral-500 w-12">#</th>
            <th className={thClass} onClick={() => onSort("title")}>
              <span className="flex items-center gap-1">Title <SortIcon field="title" sortField={sortField} sortDir={sortDir} /></span>
            </th>
            <th className={thClass} onClick={() => onSort("status")}>
              <span className="flex items-center gap-1">Status <SortIcon field="status" sortField={sortField} sortDir={sortDir} /></span>
            </th>
            <th className={thClass} onClick={() => onSort("priority")}>
              <span className="flex items-center gap-1">Priority <SortIcon field="priority" sortField={sortField} sortDir={sortDir} /></span>
            </th>
            <th className={thClass} onClick={() => onSort("assignee")}>
              <span className="flex items-center gap-1">Assignee <SortIcon field="assignee" sortField={sortField} sortDir={sortDir} /></span>
            </th>
            <th className={thClass} onClick={() => onSort("dueDate")}>
              <span className="flex items-center gap-1">Due Date <SortIcon field="dueDate" sortField={sortField} sortDir={sortDir} /></span>
            </th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-neutral-500 whitespace-nowrap">
              Comments
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {tasks.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-sm text-neutral-400">
                No tasks match the current filters.
              </td>
            </tr>
          ) : (
            tasks.map((task) => {
              const isOverdue =
                task.dueDate && task.status !== "DONE" && new Date(task.dueDate) < new Date();
              return (
                <tr
                  key={task.id}
                  className="hover:bg-neutral-50 cursor-pointer transition-colors"
                  onClick={() => onOpenTask(task)}
                >
                  <td className="px-3 py-2.5 text-xs text-neutral-400 tabular-nums font-medium">
                    {task.number > 0 ? `#${task.number}` : "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={[
                        "font-medium",
                        task.status === "DONE"
                          ? "text-neutral-400 line-through"
                          : "text-neutral-800",
                      ].join(" ")}
                    >
                      {task.title}
                    </span>
                    {task.blockedById && (
                      <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] text-red-500">
                        <AlertTriangle className="h-2.5 w-2.5" />
                        Blocked
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={[
                        "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium",
                        STATUS_COLORS[task.status],
                      ].join(" ")}
                    >
                      {STATUS_LABELS[task.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span
                      className={[
                        "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium",
                        PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS["MEDIUM"]!,
                      ].join(" ")}
                    >
                      {task.priority === "URGENT" && (
                        <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                      )}
                      {PRIORITY_LABELS[task.priority] ?? task.priority}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-neutral-500">
                    {task.assignee?.name ?? (
                      <span className="text-neutral-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {task.dueDate ? (
                      <span
                        className={[
                          "text-xs",
                          isOverdue ? "text-red-600 font-medium" : "text-neutral-500",
                        ].join(" ")}
                      >
                        {new Date(task.dueDate).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    ) : (
                      <span className="text-neutral-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-neutral-400">
                    {(task.commentCount ?? 0) > 0 ? (
                      `💬 ${task.commentCount}`
                    ) : (
                      <span className="text-neutral-300">—</span>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
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

  // View & filter state
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [filterSearch, setFilterSearch] = useState("");
  const [filterStatuses, setFilterStatuses] = useState<TaskStatus[]>([]);
  const [filterPriorities, setFilterPriorities] = useState<string[]>([]);
  const [filterAssigneeId, setFilterAssigneeId] = useState<string>("");

  // List-view sort state
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const hasFilters =
    filterSearch !== "" ||
    filterStatuses.length > 0 ||
    filterPriorities.length > 0 ||
    filterAssigneeId !== "";

  function toggleStatus(s: TaskStatus) {
    setFilterStatuses((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }

  function togglePriority(p: string) {
    setFilterPriorities((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  }

  function clearFilters() {
    setFilterSearch("");
    setFilterStatuses([]);
    setFilterPriorities([]);
    setFilterAssigneeId("");
  }

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

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

  // Filtered tasks (applied to both kanban and list views)
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (
        filterSearch &&
        !t.title.toLowerCase().includes(filterSearch.toLowerCase())
      )
        return false;
      if (filterStatuses.length > 0 && !filterStatuses.includes(t.status))
        return false;
      if (filterPriorities.length > 0 && !filterPriorities.includes(t.priority))
        return false;
      if (filterAssigneeId && t.assigneeId !== filterAssigneeId) return false;
      return true;
    });
  }, [tasks, filterSearch, filterStatuses, filterPriorities, filterAssigneeId]);

  // Sorted tasks for list view
  const sortedFilteredTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "title":
          cmp = a.title.localeCompare(b.title);
          break;
        case "status":
          cmp = (STATUS_SORT_ORDER[a.status] ?? 0) - (STATUS_SORT_ORDER[b.status] ?? 0);
          break;
        case "priority":
          cmp =
            (PRIORITY_SORT_ORDER[a.priority] ?? 99) -
            (PRIORITY_SORT_ORDER[b.priority] ?? 99);
          break;
        case "assignee":
          cmp = (a.assignee?.name ?? "").localeCompare(b.assignee?.name ?? "");
          break;
        case "dueDate":
          cmp = (a.dueDate ?? "9999-99-99").localeCompare(
            b.dueDate ?? "9999-99-99",
          );
          break;
        case "createdAt":
          cmp = a.createdAt.localeCompare(b.createdAt);
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filteredTasks, sortField, sortDir]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const canEdit = ["OWNER", "ADMIN", "EDITOR"].includes(userRole);

  // Use filteredTasks for kanban column display; full tasks array drives DnD state.
  const tasksByStatus = (status: TaskStatus) =>
    filteredTasks
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

  // ===== Filter pill class helpers =====

  const statusPillClass = (active: boolean) =>
    [
      "text-[11px] font-medium px-2 py-0.5 rounded-full border transition-colors cursor-pointer select-none",
      active
        ? "bg-[#1B4D6E] text-white border-[#1B4D6E]"
        : "bg-white text-neutral-500 border-neutral-200 hover:border-neutral-400",
    ].join(" ");

  const priorityPillClass = (p: string, active: boolean): string => {
    const base = "text-[11px] font-medium px-2 py-0.5 rounded-full border transition-colors cursor-pointer select-none";
    if (!active)
      return `${base} bg-white text-neutral-500 border-neutral-200 hover:border-neutral-400`;
    const activeBg: Record<string, string> = {
      URGENT: "bg-red-600 text-white border-red-600",
      HIGH: "bg-orange-500 text-white border-orange-500",
      MEDIUM: "bg-blue-600 text-white border-blue-600",
      LOW: "bg-neutral-500 text-white border-neutral-500",
    };
    return `${base} ${activeBg[p] ?? "bg-neutral-600 text-white border-neutral-600"}`;
  };

  return (
    <>
      {/* ===== Toolbar ===== */}
      <div className="space-y-2 mb-4">
        {/* Top row: search + assignee + clear + socket status + view toggle */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search tasks…"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm border border-neutral-200 rounded-lg w-52 focus:outline-none focus:ring-2 focus:ring-[#1B4D6E]/20 focus:border-[#1B4D6E] transition-colors"
            />
          </div>

          {/* Assignee filter */}
          <select
            value={filterAssigneeId}
            onChange={(e) => setFilterAssigneeId(e.target.value)}
            className="text-sm border border-neutral-200 rounded-lg px-2 py-1.5 text-neutral-600 focus:outline-none focus:ring-2 focus:ring-[#1B4D6E]/20 focus:border-[#1B4D6E] transition-colors bg-white"
          >
            <option value="">All assignees</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name ?? m.id}
              </option>
            ))}
          </select>

          {/* Clear filters */}
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-800 border border-neutral-200 rounded-lg px-2 py-1.5 transition-colors hover:bg-neutral-50"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Connection status indicator */}
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

          {/* View toggle */}
          <div className="flex items-center border border-neutral-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("kanban")}
              className={[
                "p-1.5 transition-colors",
                viewMode === "kanban"
                  ? "bg-[#1B4D6E] text-white"
                  : "text-neutral-400 hover:bg-neutral-50",
              ].join(" ")}
              aria-label="Kanban view"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={[
                "p-1.5 transition-colors",
                viewMode === "list"
                  ? "bg-[#1B4D6E] text-white"
                  : "text-neutral-400 hover:bg-neutral-50",
              ].join(" ")}
              aria-label="List view"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Filter pills row */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-neutral-400">Status:</span>
          {(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as TaskStatus[]).map((s) => (
            <button
              key={s}
              className={statusPillClass(filterStatuses.includes(s))}
              onClick={() => toggleStatus(s)}
            >
              {STATUS_LABELS[s]}
            </button>
          ))}

          <div className="w-px h-4 bg-neutral-200 mx-1" />

          <span className="text-[11px] text-neutral-400">Priority:</span>
          {(["URGENT", "HIGH", "MEDIUM", "LOW"] as const).map((p) => (
            <button
              key={p}
              className={priorityPillClass(p, filterPriorities.includes(p))}
              onClick={() => togglePriority(p)}
            >
              {PRIORITY_LABELS[p]}
            </button>
          ))}

          {/* Active filter summary */}
          {hasFilters && (
            <span className="text-[11px] text-[#1B4D6E] font-medium ml-1">
              {filteredTasks.length}/{tasks.length} shown
            </span>
          )}
        </div>
      </div>

      {/* ===== Board or List ===== */}
      {viewMode === "kanban" ? (
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
      ) : (
        <ListView
          tasks={sortedFilteredTasks}
          sortField={sortField}
          sortDir={sortDir}
          onSort={handleSort}
          onOpenTask={setSelectedTask}
        />
      )}

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
