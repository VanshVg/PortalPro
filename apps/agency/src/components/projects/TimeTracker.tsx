"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Play,
  Square,
  Plus,
  Trash2,
  Clock,
  DollarSign,
  Loader2,
} from "lucide-react";
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from "@portalpro/ui";
import type { TimeEntryResponse } from "@portalpro/types";
import { API_URL } from "@/lib/env";

// ===== API helpers =====

const OPTS = { credentials: "include" as const };

async function apiFetchEntries(projectId: string): Promise<TimeEntryResponse[]> {
  const res = await fetch(
    `${API_URL}/api/v1/projects/${projectId}/time-entries`,
    OPTS,
  );
  if (!res.ok) throw new Error("Failed to load time entries");
  const json = await res.json();
  return json.data as TimeEntryResponse[];
}

async function apiFetchSummary(
  projectId: string,
): Promise<{ totalMinutes: number; billableMinutes: number }> {
  const res = await fetch(
    `${API_URL}/api/v1/projects/${projectId}/time-entries/summary`,
    OPTS,
  );
  if (!res.ok) throw new Error("Failed to load summary");
  const json = await res.json();
  return json.data;
}

async function apiCreateEntry(
  data: Record<string, unknown>,
): Promise<TimeEntryResponse> {
  const res = await fetch(`${API_URL}/api/v1/time-entries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    ...OPTS,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create time entry");
  const json = await res.json();
  return json.data as TimeEntryResponse;
}

async function apiDeleteEntry(entryId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/time-entries/${entryId}`, {
    method: "DELETE",
    ...OPTS,
  });
  if (!res.ok) throw new Error("Failed to delete time entry");
}

// ===== Helpers =====

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, "0")).join(":");
}

// ===== Manual Entry Form =====

const entrySchema = z.object({
  description: z.string().max(500).optional(),
  hours: z.coerce.number().int().min(0).max(23).default(0),
  minutes: z.coerce.number().int().min(0).max(59).default(0),
  date: z.string(),
  billable: z.boolean().default(true),
});
type EntryFormValues = z.infer<typeof entrySchema>;

interface ManualEntryFormProps {
  projectId: string;
  onCreated: (entry: TimeEntryResponse) => void;
}

function ManualEntryForm({ projectId, onCreated }: ManualEntryFormProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, reset } = useForm<EntryFormValues>({
    resolver: zodResolver(entrySchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      billable: true,
      hours: 0,
      minutes: 0,
    },
  });

  const onSubmit = async (values: EntryFormValues) => {
    const totalMinutes = values.hours * 60 + values.minutes;
    if (totalMinutes < 1) {
      setError("Duration must be at least 1 minute");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const entry = await apiCreateEntry({
        projectId,
        description: values.description || null,
        minutes: totalMinutes,
        date: new Date(values.date).toISOString(),
        billable: values.billable,
      });
      onCreated(entry);
      reset({ date: new Date().toISOString().split("T")[0], billable: true, hours: 0, minutes: 0 });
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-sm text-[#2E86AB] hover:text-[#1B4D6E] font-medium transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        Log time manually
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="bg-neutral-50 rounded-xl p-4 space-y-3 border border-neutral-200"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-neutral-700">Log Time</span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-neutral-400 hover:text-neutral-600"
        >
          Cancel
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
          {error}
        </p>
      )}

      <Input
        {...register("description")}
        placeholder="What did you work on? (optional)"
        className="text-sm"
      />

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-neutral-500 mb-1">Hours</label>
          <Input
            type="number"
            min={0}
            max={23}
            {...register("hours")}
            className="text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-neutral-500 mb-1">Minutes</label>
          <Input
            type="number"
            min={0}
            max={59}
            {...register("minutes")}
            className="text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-neutral-500 mb-1">Date</label>
          <Input type="date" {...register("date")} className="text-sm" />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
        <input type="checkbox" {...register("billable")} className="rounded" />
        Billable
      </label>

      <Button type="submit" disabled={saving} size="sm" className="w-full">
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
        Save Entry
      </Button>
    </form>
  );
}

// ===== Live Timer =====

interface LiveTimerProps {
  projectId: string;
  onCreated: (entry: TimeEntryResponse) => void;
}

function LiveTimer({ projectId, onCreated }: LiveTimerProps) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // seconds
  const [description, setDescription] = useState("");
  const [billable, setBillable] = useState(true);
  const [saving, setSaving] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<Date | null>(null);

  const tick = useCallback(() => {
    if (startedAtRef.current) {
      setElapsed(Math.floor((Date.now() - startedAtRef.current.getTime()) / 1000));
    }
  }, []);

  const start = () => {
    startedAtRef.current = new Date();
    setElapsed(0);
    setRunning(true);
    intervalRef.current = setInterval(tick, 1000);
  };

  const stop = async () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setRunning(false);

    const minutes = Math.max(1, Math.round(elapsed / 60));
    setSaving(true);
    try {
      const entry = await apiCreateEntry({
        projectId,
        description: description.trim() || null,
        minutes,
        date: startedAtRef.current?.toISOString() ?? new Date().toISOString(),
        billable,
      });
      onCreated(entry);
      setElapsed(0);
      setDescription("");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div className="flex items-center gap-3 bg-neutral-50 border border-neutral-200 rounded-xl p-3">
      {/* Timer display */}
      <div
        className={[
          "font-mono text-xl font-bold tabular-nums w-24 text-center",
          running ? "text-[#1B4D6E]" : "text-neutral-400",
        ].join(" ")}
      >
        {formatElapsed(elapsed)}
      </div>

      {/* Description */}
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What are you working on?"
        disabled={running}
        className="flex-1 text-sm bg-transparent border-none outline-none placeholder-neutral-400 text-neutral-800 disabled:opacity-50"
      />

      {/* Billable toggle */}
      <label className="flex items-center gap-1 text-xs text-neutral-500 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={billable}
          onChange={(e) => setBillable(e.target.checked)}
          disabled={running}
          className="rounded"
        />
        <DollarSign className="h-3 w-3" />
      </label>

      {/* Start/Stop */}
      <Button
        type="button"
        size="sm"
        variant={running ? "destructive" : "primary"}
        onClick={running ? stop : start}
        disabled={saving}
        className="w-16 flex-shrink-0"
      >
        {saving ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : running ? (
          <Square className="h-3.5 w-3.5" />
        ) : (
          <Play className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  );
}

// ===== Entry Row =====

function EntryRow({
  entry,
  onDeleted,
}: {
  entry: TimeEntryResponse;
  onDeleted: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiDeleteEntry(entry.id);
      onDeleted(entry.id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex items-center justify-between py-3 border-b border-neutral-100 last:border-0 group">
      <div className="flex items-center gap-3">
        <div className="h-7 w-7 rounded-full bg-neutral-100 flex items-center justify-center text-[10px] font-bold text-neutral-500 flex-shrink-0">
          {entry.user.name.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p className="text-sm text-neutral-800">
            {entry.description ?? (
              <span className="text-neutral-400 italic">No description</span>
            )}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-neutral-400">
              {new Date(entry.date).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            <span className="text-[10px] text-neutral-400">· {entry.user.name}</span>
            {entry.billable && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-green-600 font-medium">
                <DollarSign className="h-2.5 w-2.5" />
                Billable
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-neutral-700 tabular-nums">
          {formatMinutes(entry.minutes)}
        </span>
        <button
          className="text-neutral-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-0.5"
          onClick={handleDelete}
          disabled={deleting}
          aria-label="Delete entry"
        >
          {deleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

// ===== Main TimeTracker =====

interface TimeTrackerProps {
  projectId: string;
}

export function TimeTracker({ projectId }: TimeTrackerProps) {
  const [entries, setEntries] = useState<TimeEntryResponse[]>([]);
  const [summary, setSummary] = useState({ totalMinutes: 0, billableMinutes: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([apiFetchEntries(projectId), apiFetchSummary(projectId)])
      .then(([es, sum]) => {
        setEntries(es);
        setSummary(sum);
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  const handleCreated = (entry: TimeEntryResponse) => {
    setEntries((prev) => [entry, ...prev]);
    setSummary((s) => ({
      totalMinutes: s.totalMinutes + entry.minutes,
      billableMinutes: entry.billable
        ? s.billableMinutes + entry.minutes
        : s.billableMinutes,
    }));
  };

  const handleDeleted = (id: string) => {
    const entry = entries.find((e) => e.id === id);
    if (entry) {
      setSummary((s) => ({
        totalMinutes: s.totalMinutes - entry.minutes,
        billableMinutes: entry.billable
          ? s.billableMinutes - entry.minutes
          : s.billableMinutes,
      }));
    }
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            label: "Total Time",
            value: formatMinutes(summary.totalMinutes),
            icon: Clock,
            color: "text-[#1B4D6E]",
          },
          {
            label: "Billable",
            value: formatMinutes(summary.billableMinutes),
            icon: DollarSign,
            color: "text-green-600",
          },
          {
            label: "Non-Billable",
            value: formatMinutes(summary.totalMinutes - summary.billableMinutes),
            icon: Clock,
            color: "text-neutral-400",
          },
          {
            label: "Entries",
            value: entries.length.toString(),
            icon: Clock,
            color: "text-neutral-600",
          },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-neutral-400 mb-1">
                <s.icon className="h-4 w-4" />
                <span className="text-xs">{s.label}</span>
              </div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Live timer */}
      <LiveTimer projectId={projectId} onCreated={handleCreated} />

      {/* Manual entry */}
      <ManualEntryForm projectId={projectId} onCreated={handleCreated} />

      {/* Entries list */}
      <Card>
        <CardHeader>
          <CardTitle>Time Log</CardTitle>
        </CardHeader>
        <CardContent className="p-0 px-6">
          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
            </div>
          )}
          {!loading && entries.length === 0 && (
            <div className="py-8 text-center text-sm text-neutral-400">
              No time logged yet. Use the timer or log manually above.
            </div>
          )}
          {entries.map((entry) => (
            <EntryRow key={entry.id} entry={entry} onDeleted={handleDeleted} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
