"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Textarea,
} from "@portalpro/ui";
import { Plus, Pencil, Trash2, CheckCircle2, Circle, Loader2 } from "lucide-react";
import type { MilestoneResponse } from "@portalpro/types";
import { API_URL } from "@/lib/env";

// ===== Schemas =====

const milestoneFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional(),
  dueDate: z.string().optional(),
});

type MilestoneFormValues = z.infer<typeof milestoneFormSchema>;

// ===== API helpers =====

async function apiCreateMilestone(
  projectId: string,
  body: MilestoneFormValues,
): Promise<MilestoneResponse> {
  const res = await fetch(`${API_URL}/api/v1/projects/${projectId}/milestones`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      title: body.title,
      description: body.description || undefined,
      dueDate: body.dueDate || undefined,
    }),
  });
  if (!res.ok) throw new Error("Failed to create milestone");
  const json = await res.json();
  return json.data as MilestoneResponse;
}

async function apiUpdateMilestone(
  milestoneId: string,
  body: Partial<MilestoneFormValues> & { isCompleted?: boolean },
): Promise<MilestoneResponse> {
  const res = await fetch(`${API_URL}/api/v1/milestones/${milestoneId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description || null }),
      ...(body.dueDate !== undefined && { dueDate: body.dueDate || null }),
      ...(body.isCompleted !== undefined && { isCompleted: body.isCompleted }),
    }),
  });
  if (!res.ok) throw new Error("Failed to update milestone");
  const json = await res.json();
  return json.data as MilestoneResponse;
}

async function apiDeleteMilestone(milestoneId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/milestones/${milestoneId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to delete milestone");
}

// ===== Milestone Form Modal =====

interface MilestoneModalProps {
  milestone?: MilestoneResponse | null;
  onSave: (milestone: MilestoneResponse) => void;
  onClose: () => void;
  projectId: string;
}

function MilestoneModal({ milestone, onSave, onClose, projectId }: MilestoneModalProps) {
  const isEditing = !!milestone;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MilestoneFormValues>({
    resolver: zodResolver(milestoneFormSchema),
    defaultValues: {
      title: milestone?.title ?? "",
      description: milestone?.description ?? "",
      dueDate: milestone?.dueDate
        ? new Date(milestone.dueDate).toISOString().split("T")[0]
        : "",
    },
  });

  const onSubmit = async (values: MilestoneFormValues) => {
    try {
      const result = isEditing
        ? await apiUpdateMilestone(milestone.id, values)
        : await apiCreateMilestone(projectId, values);
      onSave(result);
    } catch {
      // errors shown inline; toast could be added later
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Milestone" : "New Milestone"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-700">
              Title <span className="text-red-500">*</span>
            </label>
            <Input
              {...register("title")}
              placeholder="e.g. Design handoff"
              autoFocus
            />
            {errors.title && (
              <p className="text-xs text-red-500">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-700">Description</label>
            <Textarea
              {...register("description")}
              placeholder="Optional description…"
              rows={3}
            />
          </div>

          {/* Due Date */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-700">Due Date</label>
            <Input type="date" {...register("dueDate")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isEditing ? (
                "Save changes"
              ) : (
                "Create milestone"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ===== Main MilestoneManager =====

interface MilestoneManagerProps {
  projectId: string;
  initialMilestones: MilestoneResponse[];
  canEdit: boolean;
}

/**
 * Agency-side milestone list with create, edit, toggle-complete, and delete.
 */
export function MilestoneManager({
  projectId,
  initialMilestones,
  canEdit,
}: MilestoneManagerProps) {
  const [milestones, setMilestones] = useState<MilestoneResponse[]>(initialMilestones);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<MilestoneResponse | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const openCreate = useCallback(() => {
    setEditingMilestone(null);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((m: MilestoneResponse) => {
    setEditingMilestone(m);
    setModalOpen(true);
  }, []);

  const handleSaved = useCallback((saved: MilestoneResponse) => {
    setMilestones((prev) => {
      const idx = prev.findIndex((m) => m.id === saved.id);
      if (idx === -1) return [...prev, saved];
      const copy = [...prev];
      copy[idx] = saved;
      return copy;
    });
    setModalOpen(false);
  }, []);

  const handleDelete = useCallback(async (milestoneId: string) => {
    setDeletingId(milestoneId);
    try {
      await apiDeleteMilestone(milestoneId);
      setMilestones((prev) => prev.filter((m) => m.id !== milestoneId));
    } finally {
      setDeletingId(null);
    }
  }, []);

  const handleToggleComplete = useCallback(async (milestone: MilestoneResponse) => {
    setTogglingId(milestone.id);
    try {
      const updated = await apiUpdateMilestone(milestone.id, {
        isCompleted: !milestone.isCompleted,
      });
      setMilestones((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    } finally {
      setTogglingId(null);
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-700">
          Milestones ({milestones.length})
        </h3>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add milestone
          </Button>
        )}
      </div>

      {/* Empty state */}
      {milestones.length === 0 && (
        <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 py-8 text-center">
          <Circle className="mx-auto mb-2 h-7 w-7 text-neutral-300" />
          <p className="text-sm text-neutral-500">No milestones yet</p>
          {canEdit && (
            <p className="mt-1 text-xs text-neutral-400">
              Click &quot;Add milestone&quot; to create one.
            </p>
          )}
        </div>
      )}

      {/* Milestone list */}
      {milestones.length > 0 && (
        <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white overflow-hidden">
          {milestones
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((m) => {
              const progress =
                (m.taskCount ?? 0) === 0
                  ? 0
                  : Math.round(((m.completedTaskCount ?? 0) / (m.taskCount ?? 1)) * 100);
              const isDeleting = deletingId === m.id;
              const isToggling = togglingId === m.id;

              return (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3 group">
                  {/* Complete toggle */}
                  <button
                    onClick={() => !isToggling && canEdit && handleToggleComplete(m)}
                    disabled={!canEdit || isToggling}
                    className="flex-shrink-0 text-neutral-300 hover:text-green-500 disabled:cursor-default transition-colors"
                    aria-label={m.isCompleted ? "Mark incomplete" : "Mark complete"}
                  >
                    {isToggling ? (
                      <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
                    ) : m.isCompleted ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </button>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={[
                          "text-sm font-medium",
                          m.isCompleted
                            ? "text-neutral-400 line-through"
                            : "text-neutral-800",
                        ].join(" ")}
                      >
                        {m.title}
                      </span>
                      {m.dueDate && (
                        <span className="text-[10px] text-neutral-400">
                          Due{" "}
                          {new Date(m.dueDate).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      )}
                    </div>

                    {/* Progress bar */}
                    {(m.taskCount ?? 0) > 0 && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1 flex-1 rounded-full bg-neutral-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#1B4D6E] transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-neutral-400 tabular-nums">
                          {m.completedTaskCount ?? 0}/{m.taskCount} tasks · {progress}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions — visible on hover */}
                  {canEdit && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button
                        onClick={() => openEdit(m)}
                        className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition-colors"
                        aria-label="Edit milestone"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(m.id)}
                        disabled={isDeleting}
                        className="rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                        aria-label="Delete milestone"
                      >
                        {isDeleting ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* Create/Edit modal */}
      {modalOpen && (
        <MilestoneModal
          projectId={projectId}
          milestone={editingMilestone}
          onSave={handleSaved}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
