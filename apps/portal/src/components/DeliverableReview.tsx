"use client";

import { useState, useCallback } from "react";
import { CheckCircle2, AlertTriangle, Clock, Star, Loader2, Send } from "lucide-react";
import { API_URL } from "@/lib/env";

interface DeliverableItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  feedback: string | null;
  submittedAt: string | null;
}

interface DeliverableReviewProps {
  deliverables: DeliverableItem[];
}

const STATUS_CONFIG_MAP: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  DRAFT: {
    label: "Upcoming",
    color: "bg-neutral-100 text-neutral-500",
    icon: <Clock className="h-3 w-3" />,
  },
  SUBMITTED: {
    label: "Awaiting Your Review",
    color: "bg-blue-100 text-blue-700",
    icon: <Clock className="h-3 w-3" />,
  },
  APPROVED: {
    label: "Approved",
    color: "bg-green-100 text-green-700",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  REVISION_REQUESTED: {
    label: "Revision In Progress",
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
    color: "bg-neutral-100 text-neutral-500",
    icon: <Clock className="h-3 w-3" />,
  };
}

export function DeliverableReview({ deliverables: initial }: DeliverableReviewProps) {
  const [deliverables, setDeliverables] = useState<DeliverableItem[]>(initial);
  const [reviseId, setReviseId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleApprove = useCallback(async (id: string) => {
    setLoadingId(id);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/v1/deliverables/${id}/approve`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to approve");
      const json = await res.json();
      setDeliverables((prev) =>
        prev.map((d) => (d.id === id ? { ...d, status: json.data.status } : d)),
      );
    } catch {
      setError("Failed to approve deliverable. Please try again.");
    } finally {
      setLoadingId(null);
    }
  }, []);

  const handleRevise = useCallback(
    async (id: string) => {
      if (!feedback.trim()) {
        setError("Please provide feedback for the revision.");
        return;
      }
      setLoadingId(id);
      setError(null);
      try {
        const res = await fetch(`${API_URL}/api/v1/deliverables/${id}/revise`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ feedback: feedback.trim() }),
        });
        if (!res.ok) throw new Error("Failed to request revision");
        const json = await res.json();
        setDeliverables((prev) =>
          prev.map((d) =>
            d.id === id
              ? { ...d, status: json.data.status, feedback: json.data.feedback }
              : d,
          ),
        );
        setReviseId(null);
        setFeedback("");
      } catch {
        setError("Failed to request revision. Please try again.");
      } finally {
        setLoadingId(null);
      }
    },
    [feedback],
  );

  const submittedDeliverables = deliverables.filter((d) => d.status === "SUBMITTED");
  const otherDeliverables = deliverables.filter((d) => d.status !== "SUBMITTED");

  if (deliverables.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-neutral-800">Deliverables</h2>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-2.5 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Items awaiting review — shown prominently */}
      {submittedDeliverables.map((d) => (
        <div
          key={d.id}
          className="rounded-xl border-2 border-blue-200 bg-blue-50 overflow-hidden"
        >
          <div className="px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700">
                    <Clock className="h-3 w-3" />
                    Awaiting Your Review
                  </span>
                </div>
                <h3 className="text-base font-semibold text-neutral-800">{d.title}</h3>
                {d.description && (
                  <p className="text-sm text-neutral-600 mt-1 leading-relaxed">{d.description}</p>
                )}
                {d.submittedAt && (
                  <p className="text-xs text-neutral-400 mt-2">
                    Submitted{" "}
                    {new Date(d.submittedAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
            </div>

            {/* Revision feedback form */}
            {reviseId === d.id ? (
              <div className="mt-4 space-y-3">
                <label className="block text-sm font-medium text-neutral-700">
                  What needs to change?
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Describe the changes you'd like…"
                  rows={3}
                  className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 resize-none"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRevise(d.id)}
                    disabled={loadingId === d.id}
                    className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {loadingId === d.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Send Feedback
                  </button>
                  <button
                    onClick={() => {
                      setReviseId(null);
                      setFeedback("");
                    }}
                    className="px-4 py-2 rounded-lg bg-white border border-neutral-200 text-neutral-600 text-sm font-medium hover:bg-neutral-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={() => handleApprove(d.id)}
                  disabled={!!loadingId}
                  className="px-5 py-2.5 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {loadingId === d.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Approve
                </button>
                <button
                  onClick={() => setReviseId(d.id)}
                  disabled={!!loadingId}
                  className="px-5 py-2.5 rounded-lg bg-white border border-amber-300 text-amber-700 text-sm font-semibold hover:bg-amber-50 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Request Changes
                </button>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Other deliverables */}
      {otherDeliverables.length > 0 && (
        <div className="space-y-2">
          {otherDeliverables.map((d) => {
            const config = getStatusConfig(d.status);
            return (
              <div
                key={d.id}
                className="rounded-xl border border-neutral-200 bg-white px-4 py-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
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
                    <p
                      className={[
                        "text-sm font-medium",
                        d.status === "APPROVED" || d.status === "FINAL"
                          ? "text-neutral-700"
                          : "text-neutral-600",
                      ].join(" ")}
                    >
                      {d.title}
                    </p>
                    {d.description && (
                      <p className="text-xs text-neutral-500 mt-0.5">{d.description}</p>
                    )}
                    {d.status === "REVISION_REQUESTED" && d.feedback && (
                      <div className="mt-2 rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
                        <p className="text-xs font-semibold text-amber-700 mb-0.5">Your feedback:</p>
                        <p className="text-xs text-amber-800 leading-relaxed">{d.feedback}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
