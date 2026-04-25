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
import {
  Plus,
  Pencil,
  Trash2,
  Send,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Star,
  ChevronDown,
  ChevronUp,
  Loader2,
  History,
} from "lucide-react";
import type { DeliverableResponse } from "@portalpro/types";
import { API_URL } from "@/lib/env";

// ===== Schemas =====

const deliverableFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional(),
});
type DeliverableFormValues = z.infer<typeof deliverableFormSchema>;

// ===== Status config =====

const STATUS_CONFIG_MAP: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  DRAFT: {
    label: "Draft",
    color: "bg-neutral-100 text-neutral-600",
    icon: <Pencil className="h-3 w-3" />,
  },
  SUBMITTED: {
    label: "In Review",
    color: "bg-blue-100 text-blue-700",
    icon: <Clock className="h-3 w-3" />,
  },
  APPROVED: {
    label: "Approved",
    color: "bg-green-100 text-green-700",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  REVISION_REQUESTED: {
    label: "Revision Requested",
    color: "bg-amber-100 text-amber-700",
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  FINAL: {
    label: "Final",
    color: "bg-purple-100 text-purple-700",
    icon: <Star className="h-3 w-3" />,
  },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG_MAP[status] ?? {
    label: status,
    color: "bg-neutral-100 text-neutral-600",
    icon: <Pencil className="h-3 w-3" />,
  };
}

// ===== API helpers =====

async function apiListDeliverables(projectId: string): Promise<DeliverableResponse[]> {
  const res = await fetch(`${API_URL}/api/v1/projects/${projectId}/deliverables`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch deliverables");
  const json = await res.json();
  return json.data as DeliverableResponse[];
}

async function apiCreateDeliverable(
  projectId: string,
  body: DeliverableFormValues,
): Promise<DeliverableResponse> {
  const res = await fetch(`${API_URL}/api/v1/projects/${projectId}/deliverables`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ title: body.title, description: body.description || undefined }),
  });
  if (!res.ok) throw new Error("Failed to create deliverable");
  const json = await res.json();
  return json.data as DeliverableResponse;
}

async function apiUpdateDeliverable(
  id: string,
  body: DeliverableFormValues,
): Promise<DeliverableResponse> {
  const res = await fetch(`${API_URL}/api/v1/deliverables/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ title: body.title, description: body.description || undefined }),
  });
  if (!res.ok) throw new Error("Failed to update deliverable");
  const json = await res.json();
  return json.data as DeliverableResponse;
}

async function apiDeleteDeliverable(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/deliverables/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to delete deliverable");
}

async function apiSubmitDeliverable(id: string): Promise<DeliverableResponse> {
  const res = await fetch(`${API_URL}/api/v1/deliverables/${id}/submit`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to submit deliverable");
  const json = await res.json();
  return json.data as DeliverableResponse;
}

async function apiMarkFinal(id: string): Promise<DeliverableResponse> {
  const res = await fetch(`${API_URL}/api/v1/deliverables/${id}/finalise`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to mark as final");
  const json = await res.json();
  return json.data as DeliverableResponse;
}

async function apiGetRevisions(id: string): Promise<RevisionEntry[]> {
  const res = await fetch(`${API_URL}/api/v1/deliverables/${id}/revisions`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch revisions");
  const json = await res.json();
  return json.data as RevisionEntry[];
}

// ===== Types =====

interface RevisionEntry {
  id: string;
  fromStatus: string;
  toStatus: string;
  feedback: string | null;
  actorId: string | null;
  createdAt: string;
}

interface DeliverableManagerProps {
  projectId: string;
  initialDeliverables: DeliverableResponse[];
  canEdit: boolean;
}

// ===== Main Component =====

export function DeliverableManager({
  projectId,
  initialDeliverables,
  canEdit,
}: DeliverableManagerProps) {
  const [deliverables, setDeliverables] = useState<DeliverableResponse[]>(initialDeliverables);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [finalisingId, setFinalisingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [revisionsMap, setRevisionsMap] = useState<Record<string, RevisionEntry[]>>({});
  const [revisionsLoading, setRevisionsLoading] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<DeliverableFormValues>({
    resolver: zodResolver(deliverableFormSchema),
    defaultValues: { title: "", description: "" },
  });

  const openCreate = useCallback(() => {
    setEditingId(null);
    form.reset({ title: "", description: "" });
    setShowForm(true);
  }, [form]);

  const openEdit = useCallback(
    (d: DeliverableResponse) => {
      setEditingId(d.id);
      form.reset({ title: d.title, description: d.description ?? "" });
      setShowForm(true);
    },
    [form],
  );

  const handleSubmitForm = useCallback(
    async (values: DeliverableFormValues) => {
      setSaving(true);
      setError(null);
      try {
        if (editingId) {
          const updated = await apiUpdateDeliverable(editingId, values);
          setDeliverables((prev) => prev.map((d) => (d.id === editingId ? updated : d)));
        } else {
          const created = await apiCreateDeliverable(projectId, values);
          setDeliverables((prev) => [...prev, created]);
        }
        setShowForm(false);
      } catch {
        setError("Failed to save deliverable. Please try again.");
      } finally {
        setSaving(false);
      }
    },
    [editingId, projectId],
  );

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      await apiDeleteDeliverable(id);
      setDeliverables((prev) => prev.filter((d) => d.id !== id));
    } catch {
      setError("Failed to delete deliverable.");
    } finally {
      setDeletingId(null);
    }
  }, []);

  const handleSubmit = useCallback(async (id: string) => {
    setSubmittingId(id);
    try {
      const updated = await apiSubmitDeliverable(id);
      setDeliverables((prev) => prev.map((d) => (d.id === id ? updated : d)));
    } catch {
      setError("Failed to submit deliverable for review.");
    } finally {
      setSubmittingId(null);
    }
  }, []);

  const handleFinalise = useCallback(async (id: string) => {
    setFinalisingId(id);
    try {
      const updated = await apiMarkFinal(id);
      setDeliverables((prev) => prev.map((d) => (d.id === id ? updated : d)));
    } catch {
      setError("Failed to mark deliverable as final.");
    } finally {
      setFinalisingId(null);
    }
  }, []);

  const toggleRevisions = useCallback(
    async (id: string) => {
      if (expandedId === id) {
        setExpandedId(null);
        return;
      }
      setExpandedId(id);
      if (!revisionsMap[id]) {
        setRevisionsLoading(id);
        try {
          const revisions = await apiGetRevisions(id);
          setRevisionsMap((prev) => ({ ...prev, [id]: revisions }));
        } catch {
          // silently fail
        } finally {
          setRevisionsLoading(null);
        }
      }
    },
    [expandedId, revisionsMap],
  );

  const refreshDeliverables = useCallback(async () => {
    try {
      const fresh = await apiListDeliverables(projectId);
      setDeliverables(fresh);
    } catch {
      // silently fail
    }
  }, [projectId]);

  // Poll for updates when client has a submitted deliverable pending review
  const hasSubmitted = deliverables.some((d) => d.status === "SUBMITTED");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-neutral-800">Deliverables</h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Submit work for client review and approval
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasSubmitted && (
            <Button variant="ghost" size="sm" onClick={refreshDeliverables} className="text-xs">
              Refresh
            </Button>
          )}
          {canEdit && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add Deliverable
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-2.5 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* List */}
      {deliverables.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-6 py-12 text-center">
          <Send className="h-8 w-8 text-neutral-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-neutral-500">No deliverables yet</p>
          <p className="text-xs text-neutral-400 mt-1">
            Add deliverables to share work with your client for review.
          </p>
          {canEdit && (
            <Button size="sm" className="mt-4" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add First Deliverable
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {deliverables.map((d) => {
            const config = getStatusConfig(d.status);
            const isDraft = d.status === "DRAFT";
            const isRevision = d.status === "REVISION_REQUESTED";
            const isSubmitted = d.status === "SUBMITTED";
            const isApproved = d.status === "APPROVED";
            const isExpanded = expandedId === d.id;

            return (
              <div
                key={d.id}
                className="rounded-xl border border-neutral-200 bg-white overflow-hidden"
              >
                {/* Main row */}
                <div className="px-4 py-3.5 flex items-start gap-3">
                  {/* Status icon */}
                  <div className="mt-0.5 flex-shrink-0">
                    <span
                      className={[
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                        config.color,
                      ].join(" ")}
                    >
                      {config.icon}
                      {config.label}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-800 leading-snug">{d.title}</p>
                    {d.description && (
                      <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed line-clamp-2">
                        {d.description}
                      </p>
                    )}
                    {/* Feedback on revision */}
                    {isRevision && d.feedback && (
                      <div className="mt-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
                        <p className="text-xs font-semibold text-amber-700 mb-0.5">
                          Client feedback:
                        </p>
                        <p className="text-xs text-amber-800 leading-relaxed">{d.feedback}</p>
                      </div>
                    )}
                    {/* Dates */}
                    {d.submittedAt && (
                      <p className="text-xs text-neutral-400 mt-1">
                        Submitted{" "}
                        {new Date(d.submittedAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  {canEdit && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {/* Edit (DRAFT only) */}
                      {isDraft && (
                        <button
                          onClick={() => openEdit(d)}
                          className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}

                      {/* Submit (DRAFT or REVISION_REQUESTED) */}
                      {(isDraft || isRevision) && (
                        <button
                          onClick={() => handleSubmit(d.id)}
                          disabled={submittingId === d.id}
                          className="p-1.5 rounded hover:bg-blue-50 text-neutral-400 hover:text-blue-600 transition-colors disabled:opacity-50"
                          title="Submit for review"
                        >
                          {submittingId === d.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}

                      {/* Mark as Final (APPROVED only) */}
                      {isApproved && (
                        <button
                          onClick={() => handleFinalise(d.id)}
                          disabled={finalisingId === d.id}
                          className="p-1.5 rounded hover:bg-purple-50 text-neutral-400 hover:text-purple-600 transition-colors disabled:opacity-50"
                          title="Mark as final"
                        >
                          {finalisingId === d.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Star className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}

                      {/* Delete (DRAFT or REVISION_REQUESTED) */}
                      {(isDraft || isRevision) && (
                        <button
                          onClick={() => handleDelete(d.id)}
                          disabled={deletingId === d.id}
                          className="p-1.5 rounded hover:bg-red-50 text-neutral-400 hover:text-red-500 transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          {deletingId === d.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}

                      {/* Revision history toggle */}
                      <button
                        onClick={() => toggleRevisions(d.id)}
                        className="p-1.5 rounded hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors"
                        title="History"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Revision history */}
                {isExpanded && (
                  <div className="border-t border-neutral-100 bg-neutral-50 px-4 py-3">
                    <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <History className="h-3 w-3" />
                      Revision History
                    </p>
                    {revisionsLoading === d.id ? (
                      <div className="flex items-center gap-2 text-xs text-neutral-400 py-2">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Loading…
                      </div>
                    ) : (revisionsMap[d.id] ?? []).length === 0 ? (
                      <p className="text-xs text-neutral-400 py-1">No history yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {(revisionsMap[d.id] ?? []).map((rev) => (
                          <div key={rev.id} className="flex items-start gap-2 text-xs">
                            <span className="text-neutral-300 pt-0.5">•</span>
                            <div>
                              <span className="font-medium text-neutral-600">
                                {getStatusConfig(rev.fromStatus).label}
                              </span>
                              <span className="text-neutral-400"> → </span>
                              <span className="font-medium text-neutral-600">
                                {getStatusConfig(rev.toStatus).label}
                              </span>
                              <span className="text-neutral-400 ml-2">
                                {new Date(rev.createdAt).toLocaleDateString("en-GB", {
                                  day: "numeric",
                                  month: "short",
                                })}
                              </span>
                              {rev.feedback && (
                                <p className="text-neutral-500 mt-0.5 italic">
                                  &ldquo;{rev.feedback}&rdquo;
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Submitted / pending review banner */}
                {isSubmitted && (
                  <div className="border-t border-blue-100 bg-blue-50 px-4 py-2 flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" />
                    <p className="text-xs text-blue-700">
                      Awaiting client review. The client can approve or request changes.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Deliverable" : "New Deliverable"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(handleSubmitForm)} className="space-y-4 pt-2">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Title <span className="text-red-500">*</span>
              </label>
              <Input
                {...form.register("title")}
                placeholder="e.g. Final Logo Designs, Homepage Mockup v2"
                className={form.formState.errors.title ? "border-red-300" : ""}
              />
              {form.formState.errors.title && (
                <p className="text-xs text-red-500 mt-1">
                  {form.formState.errors.title.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Description
              </label>
              <Textarea
                {...form.register("description")}
                placeholder="Describe what's included in this deliverable…"
                rows={3}
              />
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Saving…
                  </>
                ) : editingId ? (
                  "Save Changes"
                ) : (
                  "Create Deliverable"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
