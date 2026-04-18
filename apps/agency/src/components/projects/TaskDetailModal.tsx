"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  X,
  Trash2,
  Send,
  AlertTriangle,
  Flag,
  Calendar,
  User,
  Link2,
  Loader2,
} from "lucide-react";
import { Button, Input, Textarea } from "@portalpro/ui";
import type { TaskResponse, CommentResponse } from "@portalpro/types";
import { API_URL } from "@/lib/env";

// ===== Form schema =====

const taskFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
  milestoneId: z.string().optional(),
  blockedById: z.string().optional(),
});
type TaskFormValues = z.infer<typeof taskFormSchema>;

// ===== API helpers =====

const OPTS = { credentials: "include" as const };

async function apiCreateTask(
  projectId: string,
  data: Record<string, unknown>,
): Promise<TaskResponse> {
  const res = await fetch(`${API_URL}/api/v1/projects/${projectId}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    ...OPTS,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create task");
  const json = await res.json();
  return json.data as TaskResponse;
}

async function apiUpdateTask(
  taskId: string,
  data: Record<string, unknown>,
): Promise<TaskResponse> {
  const res = await fetch(`${API_URL}/api/v1/tasks/${taskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    ...OPTS,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update task");
  const json = await res.json();
  return json.data as TaskResponse;
}

async function apiDeleteTask(taskId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/tasks/${taskId}`, {
    method: "DELETE",
    ...OPTS,
  });
  if (!res.ok) throw new Error("Failed to delete task");
}

async function apiFetchComments(taskId: string): Promise<CommentResponse[]> {
  const res = await fetch(`${API_URL}/api/v1/tasks/${taskId}/comments`, OPTS);
  if (!res.ok) throw new Error("Failed to fetch comments");
  const json = await res.json();
  return json.data as CommentResponse[];
}

async function apiPostComment(
  taskId: string,
  content: string,
): Promise<CommentResponse> {
  const res = await fetch(`${API_URL}/api/v1/tasks/${taskId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    ...OPTS,
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error("Failed to post comment");
  const json = await res.json();
  return json.data as CommentResponse;
}

async function apiDeleteComment(commentId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/comments/${commentId}`, {
    method: "DELETE",
    ...OPTS,
  });
  if (!res.ok) throw new Error("Failed to delete comment");
}

// ===== Sub-components =====

const STATUS_OPTIONS = [
  { value: "TODO", label: "To Do" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "IN_REVIEW", label: "In Review" },
  { value: "DONE", label: "Done" },
] as const;

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
] as const;

// ===== Main Modal =====

interface TaskDetailModalProps {
  projectId: string;
  task: TaskResponse | null;
  defaultStatus?: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
  members: { id: string; name: string; avatarUrl: string | null }[];
  canEdit: boolean;
  onUpdated: (task: TaskResponse) => void;
  onDeleted: (taskId: string) => void;
  onCreated: (task: TaskResponse) => void;
  onClose: () => void;
}

export function TaskDetailModal({
  projectId,
  task,
  defaultStatus = "TODO",
  members,
  canEdit,
  onUpdated,
  onDeleted,
  onCreated,
  onClose,
}: TaskDetailModalProps) {
  const isNew = task === null;
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [comments, setComments] = useState<CommentResponse[]>([]);
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: task?.title ?? "",
      description: task?.description ?? "",
      status: (task?.status ?? defaultStatus) as TaskFormValues["status"],
      priority: (task?.priority ?? "MEDIUM") as TaskFormValues["priority"],
      assigneeId: task?.assigneeId ?? "",
      dueDate: task?.dueDate ? task.dueDate.split("T")[0] : "",
      milestoneId: task?.milestoneId ?? "",
      blockedById: task?.blockedById ?? "",
    },
  });

  // Load comments when viewing an existing task
  useEffect(() => {
    if (task?.id) {
      apiFetchComments(task.id)
        .then(setComments)
        .catch(() => {});
    }
  }, [task?.id]);

  const onSubmit = async (values: TaskFormValues) => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: values.title,
        description: values.description || null,
        status: values.status,
        priority: values.priority,
        assigneeId: values.assigneeId || null,
        dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : null,
        milestoneId: values.milestoneId || null,
        blockedById: values.blockedById || null,
      };

      if (isNew) {
        const created = await apiCreateTask(projectId, payload);
        onCreated(created);
      } else {
        const updated = await apiUpdateTask(task!.id, payload);
        onUpdated(updated);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!task || !confirm("Delete this task? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await apiDeleteTask(task.id);
      onDeleted(task.id);
    } catch {
      setError("Failed to delete task");
    } finally {
      setDeleting(false);
    }
  };

  const handlePostComment = async () => {
    if (!task || !commentText.trim()) return;
    setPostingComment(true);
    try {
      const comment = await apiPostComment(task.id, commentText.trim());
      setComments((prev) => [...prev, comment]);
      setCommentText("");
    } catch {
      setError("Failed to post comment");
    } finally {
      setPostingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await apiDeleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch {
      setError("Failed to delete comment");
    }
  };

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-start justify-end bg-black/30 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Side panel */}
      <div className="h-full w-full max-w-xl bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <h2 className="text-base font-semibold text-neutral-800">
            {isNew ? "New Task" : "Task Details"}
          </h2>
          <div className="flex items-center gap-2">
            {!isNew && canEdit && (
              <button
                className="text-neutral-400 hover:text-red-600 transition-colors p-1 rounded"
                onClick={handleDelete}
                disabled={deleting}
                aria-label="Delete task"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            )}
            <button
              className="text-neutral-400 hover:text-neutral-700 transition-colors p-1 rounded"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <Input
                {...register("title")}
                placeholder="Task title"
                disabled={!canEdit}
                className={errors.title ? "border-red-400" : ""}
              />
              {errors.title && (
                <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">
                Description
              </label>
              <Textarea
                {...register("description")}
                placeholder="Add details…"
                rows={3}
                disabled={!canEdit}
              />
            </div>

            {/* Status + Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">
                  <Flag className="inline h-3 w-3 mr-1" />
                  Status
                </label>
                <select
                  {...register("status")}
                  disabled={!canEdit}
                  className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D6E]/30 disabled:opacity-50"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">
                  <AlertTriangle className="inline h-3 w-3 mr-1" />
                  Priority
                </label>
                <select
                  {...register("priority")}
                  disabled={!canEdit}
                  className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D6E]/30 disabled:opacity-50"
                >
                  {PRIORITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Assignee + Due Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">
                  <User className="inline h-3 w-3 mr-1" />
                  Assignee
                </label>
                <select
                  {...register("assigneeId")}
                  disabled={!canEdit}
                  className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4D6E]/30 disabled:opacity-50"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-500 mb-1">
                  <Calendar className="inline h-3 w-3 mr-1" />
                  Due Date
                </label>
                <Input
                  type="date"
                  {...register("dueDate")}
                  disabled={!canEdit}
                />
              </div>
            </div>

            {/* Blocked By */}
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">
                <Link2 className="inline h-3 w-3 mr-1" />
                Blocked by Task ID
              </label>
              <Input
                {...register("blockedById")}
                placeholder="Paste task ID (optional)"
                disabled={!canEdit}
              />
            </div>

            {/* Save button */}
            {canEdit && (
              <Button
                type="submit"
                disabled={saving}
                className="w-full"
              >
                {saving ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</>
                ) : isNew ? (
                  "Create Task"
                ) : (
                  "Save Changes"
                )}
              </Button>
            )}
          </form>

          {/* Comments section — only for existing tasks */}
          {!isNew && (
            <div className="px-6 pb-6 border-t border-neutral-100 pt-5">
              <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-4">
                Comments ({comments.length})
              </h3>

              <div className="space-y-3 mb-4">
                {comments.length === 0 && (
                  <p className="text-sm text-neutral-400">No comments yet.</p>
                )}
                {comments.map((c) => (
                  <div key={c.id} className="flex gap-3 group">
                    <div className="h-7 w-7 rounded-full bg-[#1B4D6E] text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                      {c.author.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs font-semibold text-neutral-700">
                          {c.author.name}
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          {new Date(c.createdAt).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-700 mt-0.5 whitespace-pre-wrap">
                        {c.content}
                      </p>
                    </div>
                    <button
                      className="opacity-0 group-hover:opacity-100 text-neutral-300 hover:text-red-500 transition-all p-0.5 flex-shrink-0"
                      onClick={() => handleDeleteComment(c.id)}
                      aria-label="Delete comment"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Comment input */}
              <div className="flex gap-2">
                <Textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment…"
                  rows={2}
                  className="flex-1 resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      handlePostComment();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePostComment}
                  disabled={postingComment || !commentText.trim()}
                  className="self-end"
                >
                  {postingComment ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
              <p className="text-[10px] text-neutral-400 mt-1">⌘+Enter to send</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
