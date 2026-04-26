"use client";

import { useState, useCallback, useId } from "react";
import dynamic from "next/dynamic";
import { useForm, useFieldArray } from "react-hook-form";
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
  Trash2,
  Send,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  FileText,
  CreditCard,
} from "lucide-react";
import type { InvoiceResponse } from "@portalpro/types";
import { API_URL } from "@/lib/env";

const InvoicePDFDownload = dynamic(() => import("./InvoicePDFDownload"), { ssr: false });

// ===== Schemas =====

const lineItemSchema = z.object({
  title: z.string().min(1, "Required"),
  description: z.string().optional(),
  quantity: z.coerce.number().positive().default(1),
  unitPrice: z.coerce.number().min(0, "Must be ≥ 0"),
});

const invoiceFormSchema = z.object({
  number: z.string().min(1, "Invoice number is required"),
  clientEmail: z.string().email("Valid email required").optional().or(z.literal("")),
  currency: z.enum(["GBP", "USD", "EUR", "AED"]).default("GBP"),
  dueDate: z.string().optional(),
  projectId: z.string().optional(),
  notes: z.string().max(2000).optional(),
  lineItems: z.array(lineItemSchema).min(1, "Add at least one line item"),
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

const sendFormSchema = z.object({
  clientEmail: z.string().email("Valid email required"),
});
type SendFormValues = z.infer<typeof sendFormSchema>;

// ===== Status config =====

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  DRAFT: {
    label: "Draft",
    color: "bg-neutral-100 text-neutral-600",
    icon: <FileText className="h-3 w-3" />,
  },
  SENT: {
    label: "Sent",
    color: "bg-blue-100 text-blue-700",
    icon: <Send className="h-3 w-3" />,
  },
  PAID: {
    label: "Paid",
    color: "bg-green-100 text-green-700",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  OVERDUE: {
    label: "Overdue",
    color: "bg-red-100 text-red-700",
    icon: <AlertCircle className="h-3 w-3" />,
  },
  CANCELLED: {
    label: "Cancelled",
    color: "bg-neutral-100 text-neutral-400",
    icon: <XCircle className="h-3 w-3" />,
  },
};

const CURRENCIES = ["GBP", "USD", "EUR", "AED"] as const;

function getInvoiceStatusConfig(status: string) {
  return STATUS_CONFIG[status] ?? {
    label: status,
    color: "bg-neutral-100 text-neutral-600",
    icon: <FileText className="h-3 w-3" />,
  };
}

// ===== API helpers =====

async function apiCreateInvoice(body: InvoiceFormValues): Promise<InvoiceResponse> {
  const payload = {
    number: body.number,
    clientEmail: body.clientEmail || undefined,
    currency: body.currency,
    dueDate: body.dueDate || undefined,
    projectId: body.projectId || undefined,
    notes: body.notes || undefined,
    lineItems: body.lineItems,
  };
  const res = await fetch(`${API_URL}/api/v1/invoices`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "Failed to create invoice");
  }
  const json = await res.json();
  return json.data as InvoiceResponse;
}

async function apiUpdateInvoice(id: string, body: InvoiceFormValues): Promise<InvoiceResponse> {
  const payload = {
    number: body.number,
    clientEmail: body.clientEmail || undefined,
    currency: body.currency,
    dueDate: body.dueDate || undefined,
    projectId: body.projectId || undefined,
    notes: body.notes || undefined,
    lineItems: body.lineItems,
  };
  const res = await fetch(`${API_URL}/api/v1/invoices/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update invoice");
  const json = await res.json();
  return json.data as InvoiceResponse;
}

async function apiDeleteInvoice(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/v1/invoices/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to delete invoice");
}

async function apiSendInvoice(id: string, clientEmail: string): Promise<InvoiceResponse> {
  const res = await fetch(`${API_URL}/api/v1/invoices/${id}/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ clientEmail }),
  });
  if (!res.ok) throw new Error("Failed to send invoice");
  const json = await res.json();
  return json.data as InvoiceResponse;
}

async function apiMarkPaid(id: string): Promise<InvoiceResponse> {
  const res = await fetch(`${API_URL}/api/v1/invoices/${id}/mark-paid`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to mark invoice as paid");
  const json = await res.json();
  return json.data as InvoiceResponse;
}

async function apiCancelInvoice(id: string): Promise<InvoiceResponse> {
  const res = await fetch(`${API_URL}/api/v1/invoices/${id}/cancel`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to cancel invoice");
  const json = await res.json();
  return json.data as InvoiceResponse;
}

// ===== Helpers =====

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function computeTotal(items: { quantity: number | string; unitPrice: number | string }[]): number {
  return items.reduce(
    (sum, item) => sum + Number(item.quantity) * Number(item.unitPrice),
    0,
  );
}

// ===== Component =====

interface InvoiceManagerProps {
  initialInvoices: InvoiceResponse[];
  projects: { id: string; name: string }[];
}

type FilterStatus = "ALL" | "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED";

export function InvoiceManager({ initialInvoices, projects }: InvoiceManagerProps) {
  const [invoices, setInvoices] = useState<InvoiceResponse[]>(initialInvoices);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("ALL");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formId = useId();

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      number: "",
      clientEmail: "",
      currency: "GBP",
      dueDate: "",
      projectId: "",
      notes: "",
      lineItems: [{ title: "", description: "", quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lineItems",
  });

  const sendForm = useForm<SendFormValues>({
    resolver: zodResolver(sendFormSchema),
    defaultValues: { clientEmail: "" },
  });

  const watchedLineItems = form.watch("lineItems");
  const watchedCurrency = form.watch("currency");
  const runningTotal = computeTotal(watchedLineItems ?? []);

  const openCreate = useCallback(() => {
    setEditingId(null);
    // Auto-generate invoice number
    const nextNum = invoices.length + 1;
    form.reset({
      number: `INV-${String(nextNum).padStart(4, "0")}`,
      clientEmail: "",
      currency: "GBP",
      dueDate: "",
      projectId: "",
      notes: "",
      lineItems: [{ title: "", description: "", quantity: 1, unitPrice: 0 }],
    });
    setError(null);
    setShowForm(true);
  }, [form, invoices.length]);

  const openEdit = useCallback(
    (inv: InvoiceResponse) => {
      setEditingId(inv.id);
      const dueDate = inv.dueDate
        ? new Date(inv.dueDate).toISOString().split("T")[0]
        : "";
      form.reset({
        number: inv.number,
        clientEmail: inv.clientEmail ?? "",
        currency: (inv.currency as "GBP" | "USD" | "EUR" | "AED") ?? "GBP",
        dueDate: dueDate ?? "",
        projectId: inv.projectId ?? "",
        notes: inv.notes ?? "",
        lineItems:
          inv.lineItems.length > 0
            ? inv.lineItems
            : [{ title: "", description: "", quantity: 1, unitPrice: 0 }],
      });
      setError(null);
      setShowForm(true);
    },
    [form],
  );

  const handleSubmitForm = useCallback(
    async (values: InvoiceFormValues) => {
      setSaving(true);
      setError(null);
      try {
        if (editingId) {
          const updated = await apiUpdateInvoice(editingId, values);
          setInvoices((prev) => prev.map((inv) => (inv.id === editingId ? updated : inv)));
        } else {
          const created = await apiCreateInvoice(values);
          setInvoices((prev) => [created, ...prev]);
        }
        setShowForm(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save invoice");
      } finally {
        setSaving(false);
      }
    },
    [editingId],
  );

  const handleDelete = useCallback(async (id: string) => {
    setLoadingId(id);
    try {
      await apiDeleteInvoice(id);
      setInvoices((prev) => prev.filter((inv) => inv.id !== id));
    } catch {
      setError("Failed to delete invoice.");
    } finally {
      setLoadingId(null);
    }
  }, []);

  const openSendDialog = useCallback(
    (inv: InvoiceResponse) => {
      sendForm.reset({ clientEmail: inv.clientEmail ?? "" });
      setSendingId(inv.id);
    },
    [sendForm],
  );

  const handleSend = useCallback(
    async (values: SendFormValues) => {
      if (!sendingId) return;
      setLoadingId(sendingId);
      try {
        const updated = await apiSendInvoice(sendingId, values.clientEmail);
        setInvoices((prev) => prev.map((inv) => (inv.id === sendingId ? updated : inv)));
        setSendingId(null);
      } catch {
        setError("Failed to send invoice.");
      } finally {
        setLoadingId(null);
      }
    },
    [sendingId],
  );

  const handleMarkPaid = useCallback(async (id: string) => {
    setLoadingId(id);
    try {
      const updated = await apiMarkPaid(id);
      setInvoices((prev) => prev.map((inv) => (inv.id === id ? updated : inv)));
    } catch {
      setError("Failed to mark invoice as paid.");
    } finally {
      setLoadingId(null);
    }
  }, []);

  const handleCancel = useCallback(async (id: string) => {
    setLoadingId(id);
    try {
      const updated = await apiCancelInvoice(id);
      setInvoices((prev) => prev.map((inv) => (inv.id === id ? updated : inv)));
    } catch {
      setError("Failed to cancel invoice.");
    } finally {
      setLoadingId(null);
    }
  }, []);

  const filteredInvoices = invoices.filter(
    (inv) => filterStatus === "ALL" || inv.status === filterStatus,
  );

  const totalsByStatus = invoices.reduce(
    (acc, inv) => {
      acc[inv.status] = (acc[inv.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const paidTotal = invoices
    .filter((inv) => inv.status === "PAID")
    .reduce((sum, inv) => sum + inv.amount, 0);

  const outstandingTotal = invoices
    .filter((inv) => ["SENT", "OVERDUE"].includes(inv.status))
    .reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            label: "Total Invoices",
            value: invoices.length,
            sub: "all time",
            color: "text-neutral-800",
          },
          {
            label: "Outstanding",
            value: formatCurrency(outstandingTotal, "GBP"),
            sub: `${(totalsByStatus["SENT"] ?? 0) + (totalsByStatus["OVERDUE"] ?? 0)} invoice(s)`,
            color: "text-amber-600",
          },
          {
            label: "Paid",
            value: formatCurrency(paidTotal, "GBP"),
            sub: `${totalsByStatus["PAID"] ?? 0} invoice(s)`,
            color: "text-green-600",
          },
          {
            label: "Overdue",
            value: totalsByStatus["OVERDUE"] ?? 0,
            sub: "past due date",
            color: (totalsByStatus["OVERDUE"] ?? 0) > 0 ? "text-red-600" : "text-neutral-800",
          },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-neutral-200 bg-white p-5">
            <p className="text-xs text-neutral-400 mb-1">{card.label}</p>
            <p className={["text-xl font-bold", card.color].join(" ")}>{card.value}</p>
            <p className="text-xs text-neutral-400 mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1 flex-wrap">
          {(["ALL", "DRAFT", "SENT", "PAID", "OVERDUE", "CANCELLED"] as FilterStatus[]).map(
            (s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={[
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                  filterStatus === s
                    ? "bg-[#1B4D6E] text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200",
                ].join(" ")}
              >
                {s === "ALL" ? `All (${invoices.length})` : `${s.charAt(0) + s.slice(1).toLowerCase()} (${totalsByStatus[s] ?? 0})`}
              </button>
            ),
          )}
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" />
          New Invoice
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-2.5 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Invoice list */}
      {filteredInvoices.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-6 py-16 text-center">
          <FileText className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-neutral-500">No invoices found</p>
          <p className="text-xs text-neutral-400 mt-1">
            {filterStatus === "ALL"
              ? "Create your first invoice to get started."
              : `No ${filterStatus.toLowerCase()} invoices.`}
          </p>
          {filterStatus === "ALL" && (
            <Button size="sm" className="mt-4" onClick={openCreate}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              New Invoice
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">
                  Invoice
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">
                  Client
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">
                  Due
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">
                  Status
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredInvoices.map((inv) => {
                const config = getInvoiceStatusConfig(inv.status);
                const isDraft = inv.status === "DRAFT";
                const isSent = inv.status === "SENT";
                const isPaid = inv.status === "PAID";
                const isCancelled = inv.status === "CANCELLED";
                const isOverdue = inv.status === "OVERDUE";
                const isLoading = loadingId === inv.id;

                return (
                  <tr key={inv.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-medium text-neutral-800">{inv.number}</span>
                      {inv.projectId && (
                        <span className="ml-2 text-xs text-neutral-400">
                          {projects.find((p) => p.id === inv.projectId)?.name ?? ""}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {inv.clientEmail ?? <span className="text-neutral-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-neutral-800 tabular-nums">
                        {formatCurrency(inv.amount, inv.currency)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-500 tabular-nums">
                      {inv.dueDate ? (
                        <span
                          className={
                            isOverdue ? "text-red-600 font-medium" : ""
                          }
                        >
                          {new Date(inv.dueDate).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      ) : (
                        <span className="text-neutral-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={[
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                          config.color,
                        ].join(" ")}
                      >
                        {config.icon}
                        {config.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {/* Edit (DRAFT only) */}
                        {isDraft && (
                          <button
                            onClick={() => openEdit(inv)}
                            className="text-xs px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors"
                          >
                            Edit
                          </button>
                        )}

                        {/* Send */}
                        {(isDraft || isSent) && (
                          <button
                            onClick={() => openSendDialog(inv)}
                            disabled={isLoading}
                            className="text-xs px-2.5 py-1 rounded-lg bg-[#1B4D6E] text-white hover:bg-[#0F3049] transition-colors disabled:opacity-50"
                          >
                            {isLoading ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : isSent ? (
                              "Resend"
                            ) : (
                              "Send"
                            )}
                          </button>
                        )}

                        {/* Stripe pay link */}
                        {isSent && inv.stripeLink && (
                          <a
                            href={inv.stripeLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors"
                            title="Open payment link"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}

                        {/* Mark paid */}
                        {(isSent || isOverdue) && (
                          <button
                            onClick={() => handleMarkPaid(inv.id)}
                            disabled={isLoading}
                            className="text-xs px-2.5 py-1 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors disabled:opacity-50"
                          >
                            {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Mark Paid"}
                          </button>
                        )}

                        {/* PDF Download */}
                        <InvoicePDFDownload invoice={inv} />

                        {/* Cancel */}
                        {!isPaid && !isCancelled && (
                          <button
                            onClick={() => handleCancel(inv.id)}
                            disabled={isLoading}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-neutral-400 hover:text-red-500 transition-colors disabled:opacity-50"
                            title="Cancel invoice"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        )}

                        {/* Delete (DRAFT/CANCELLED) */}
                        {(isDraft || isCancelled) && (
                          <button
                            onClick={() => handleDelete(inv.id)}
                            disabled={isLoading}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-neutral-400 hover:text-red-500 transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            {isLoading ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Invoice" : "New Invoice"}</DialogTitle>
          </DialogHeader>

          <form
            id={formId}
            onSubmit={form.handleSubmit(handleSubmitForm)}
            className="space-y-5 pt-2"
          >
            {/* Row 1: Number + Currency */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  Invoice Number <span className="text-red-500">*</span>
                </label>
                <Input
                  {...form.register("number")}
                  placeholder="INV-0001"
                  className={form.formState.errors.number ? "border-red-300" : ""}
                />
                {form.formState.errors.number && (
                  <p className="text-xs text-red-500 mt-1">
                    {form.formState.errors.number.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  Currency
                </label>
                <select
                  {...form.register("currency")}
                  className="w-full h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#1B4D6E]/20 focus:border-[#1B4D6E]"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Client email + Project */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  Client Email
                </label>
                <Input
                  {...form.register("clientEmail")}
                  type="email"
                  placeholder="client@example.com"
                  className={form.formState.errors.clientEmail ? "border-red-300" : ""}
                />
                {form.formState.errors.clientEmail && (
                  <p className="text-xs text-red-500 mt-1">
                    {form.formState.errors.clientEmail.message}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  Project
                </label>
                <select
                  {...form.register("projectId")}
                  className="w-full h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-[#1B4D6E]/20 focus:border-[#1B4D6E]"
                >
                  <option value="">No project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Due date */}
            <div className="w-1/2">
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Due Date
              </label>
              <Input {...form.register("dueDate")} type="date" />
            </div>

            {/* Line items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-neutral-700">
                  Line Items <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() =>
                    append({ title: "", description: "", quantity: 1, unitPrice: 0 })
                  }
                  className="text-xs text-[#1B4D6E] font-medium hover:underline flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Add line
                </button>
              </div>

              {form.formState.errors.lineItems && (
                <p className="text-xs text-red-500 mb-2">
                  {form.formState.errors.lineItems.message}
                </p>
              )}

              <div className="rounded-lg border border-neutral-200 overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-12 gap-2 bg-neutral-50 px-3 py-2 text-xs font-semibold text-neutral-500">
                  <div className="col-span-5">Description</div>
                  <div className="col-span-2 text-right">Qty</div>
                  <div className="col-span-3 text-right">Unit Price</div>
                  <div className="col-span-1 text-right">Amount</div>
                  <div className="col-span-1" />
                </div>

                <div className="divide-y divide-neutral-100">
                  {fields.map((field, index) => {
                    const qty = Number(form.watch(`lineItems.${index}.quantity`) ?? 1);
                    const price = Number(form.watch(`lineItems.${index}.unitPrice`) ?? 0);
                    return (
                      <div
                        key={field.id}
                        className="grid grid-cols-12 gap-2 px-3 py-2.5 items-center"
                      >
                        <div className="col-span-5">
                          <Input
                            {...form.register(`lineItems.${index}.title`)}
                            placeholder="Service or product name"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div className="col-span-2">
                          <Input
                            {...form.register(`lineItems.${index}.quantity`)}
                            type="number"
                            min="0.01"
                            step="0.01"
                            className="h-8 text-sm text-right"
                          />
                        </div>
                        <div className="col-span-3">
                          <Input
                            {...form.register(`lineItems.${index}.unitPrice`)}
                            type="number"
                            min="0"
                            step="0.01"
                            className="h-8 text-sm text-right"
                          />
                        </div>
                        <div className="col-span-1 text-right text-sm font-medium text-neutral-700 tabular-nums">
                          {formatCurrency(qty * price, watchedCurrency)}
                        </div>
                        <div className="col-span-1 flex justify-end">
                          {fields.length > 1 && (
                            <button
                              type="button"
                              onClick={() => remove(index)}
                              className="text-neutral-300 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Total */}
                <div className="border-t border-neutral-200 bg-neutral-50 px-3 py-2 flex justify-end">
                  <div className="text-sm">
                    <span className="font-semibold text-neutral-500 mr-4">Total</span>
                    <span className="font-bold text-neutral-800 text-base tabular-nums">
                      {formatCurrency(runningTotal, watchedCurrency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Notes</label>
              <Textarea
                {...form.register("notes")}
                placeholder="Payment terms, bank details, or any additional notes…"
                rows={2}
              />
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}
          </form>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowForm(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button form={formId} type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Saving…
                </>
              ) : editingId ? (
                "Save Changes"
              ) : (
                <>
                  <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                  Create Invoice
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Dialog */}
      <Dialog open={!!sendingId} onOpenChange={(open) => !open && setSendingId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Send Invoice</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={sendForm.handleSubmit(handleSend)}
            className="space-y-4 pt-2"
          >
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Client Email <span className="text-red-500">*</span>
              </label>
              <Input
                {...sendForm.register("clientEmail")}
                type="email"
                placeholder="client@example.com"
                className={sendForm.formState.errors.clientEmail ? "border-red-300" : ""}
              />
              {sendForm.formState.errors.clientEmail && (
                <p className="text-xs text-red-500 mt-1">
                  {sendForm.formState.errors.clientEmail.message}
                </p>
              )}
            </div>
            <p className="text-xs text-neutral-400">
              The client will receive an email with the invoice details and a payment link (if
              Stripe is configured).
            </p>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSendingId(null)}
                disabled={!!loadingId}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!!loadingId}>
                {loadingId ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    Send Invoice
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
