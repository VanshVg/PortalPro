import { prisma } from "@portalpro/database";
import { NotFoundError, ForbiddenError } from "@portalpro/types";
import type {
  InvoiceResponse,
  CreateInvoiceInput,
  UpdateInvoiceInput,
  SendInvoiceInput,
  InvoiceLineItem,
} from "@portalpro/types";
import { createPaymentLink } from "../../lib/stripe";
import { sendInvoiceEmail, sendPaymentReceivedEmail } from "@portalpro/email/server";
import { logger } from "../../lib/logger";

/**
 * Computes the total amount from line items.
 */
function computeTotal(lineItems: InvoiceLineItem[]): number {
  return lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}

type RawInvoice = {
  id: string;
  number: string;
  clientEmail: string | null;
  amount: { toNumber(): number };
  currency: string;
  status: string;
  dueDate: Date | null;
  paidAt: Date | null;
  stripeLink: string | null;
  projectId: string | null;
  notes: string | null;
  lineItems: unknown;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Serialises a raw Invoice DB record to the InvoiceResponse DTO.
 */
function toInvoiceResponse(inv: RawInvoice): InvoiceResponse {
  const lineItems = Array.isArray(inv.lineItems)
    ? (inv.lineItems as InvoiceLineItem[])
    : [];

  return {
    id: inv.id,
    number: inv.number,
    clientEmail: inv.clientEmail,
    amount: inv.amount.toNumber(),
    currency: inv.currency,
    status: inv.status as InvoiceResponse["status"],
    dueDate: inv.dueDate?.toISOString() ?? null,
    paidAt: inv.paidAt?.toISOString() ?? null,
    stripeLink: inv.stripeLink,
    projectId: inv.projectId,
    notes: inv.notes,
    lineItems,
    createdAt: inv.createdAt.toISOString(),
    updatedAt: inv.updatedAt.toISOString(),
  };
}

/**
 * Verifies invoice belongs to tenant and returns it.
 */
async function requireInvoiceAccess(tenantId: string, invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice || invoice.tenantId !== tenantId) {
    throw new NotFoundError("Invoice", invoiceId);
  }
  return invoice;
}

/**
 * Lists all invoices for the tenant, optionally filtered by status or projectId.
 */
export async function listInvoices(
  tenantId: string,
  filters?: { status?: string; projectId?: string },
): Promise<InvoiceResponse[]> {
  const invoices = await prisma.invoice.findMany({
    where: {
      tenantId,
      ...(filters?.status && { status: filters.status as never }),
      ...(filters?.projectId && { projectId: filters.projectId }),
    },
    orderBy: { createdAt: "desc" },
  });

  return invoices.map(toInvoiceResponse);
}

/**
 * Gets a single invoice by id.
 */
export async function getInvoice(tenantId: string, invoiceId: string): Promise<InvoiceResponse> {
  const invoice = await requireInvoiceAccess(tenantId, invoiceId);
  return toInvoiceResponse(invoice);
}

/**
 * Creates a new invoice in DRAFT status.
 * Amount is computed from line items.
 */
export async function createInvoice(
  tenantId: string,
  input: CreateInvoiceInput,
): Promise<InvoiceResponse> {
  const amount = computeTotal(input.lineItems);

  const invoice = await prisma.invoice.create({
    data: {
      tenantId,
      number: input.number,
      clientEmail: input.clientEmail ?? null,
      amount: amount,
      currency: input.currency,
      dueDate: input.dueDate ?? null,
      projectId: input.projectId ?? null,
      notes: input.notes ?? null,
      lineItems: input.lineItems as never,
    },
  });

  return toInvoiceResponse(invoice);
}

/**
 * Updates a DRAFT invoice.
 */
export async function updateInvoice(
  tenantId: string,
  invoiceId: string,
  input: UpdateInvoiceInput,
): Promise<InvoiceResponse> {
  const existing = await requireInvoiceAccess(tenantId, invoiceId);

  if (existing.status !== "DRAFT") {
    throw new ForbiddenError("Only DRAFT invoices can be edited");
  }

  const lineItems = input.lineItems ?? (existing.lineItems as unknown as InvoiceLineItem[]);
  const amount = computeTotal(lineItems);

  const updated = await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      ...(input.number !== undefined && { number: input.number }),
      ...(input.clientEmail !== undefined && { clientEmail: input.clientEmail }),
      ...(input.currency !== undefined && { currency: input.currency }),
      ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
      ...(input.projectId !== undefined && { projectId: input.projectId }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.lineItems !== undefined && {
        lineItems: input.lineItems as never,
      }),
      amount: amount,
    },
  });

  return toInvoiceResponse(updated);
}

/**
 * Deletes a DRAFT invoice.
 */
export async function deleteInvoice(tenantId: string, invoiceId: string): Promise<void> {
  const existing = await requireInvoiceAccess(tenantId, invoiceId);

  if (!["DRAFT", "CANCELLED"].includes(existing.status)) {
    throw new ForbiddenError("Only DRAFT or CANCELLED invoices can be deleted");
  }

  await prisma.invoice.delete({ where: { id: invoiceId } });
}

/**
 * Sends an invoice to a client via email (DRAFT → SENT).
 * Generates a Stripe Payment Link if Stripe is configured.
 */
export async function sendInvoice(
  tenantId: string,
  invoiceId: string,
  input: SendInvoiceInput,
): Promise<InvoiceResponse> {
  const existing = await requireInvoiceAccess(tenantId, invoiceId);

  if (!["DRAFT", "SENT"].includes(existing.status)) {
    throw new ForbiddenError("Only DRAFT or SENT invoices can be (re-)sent");
  }

  const amountCents = Math.round(existing.amount.toNumber() * 100);
  const stripeLink = await createPaymentLink({
    invoiceNumber: existing.number,
    amountCents,
    currency: existing.currency,
    description: `Payment for invoice ${existing.number}`,
  }).catch((err: unknown) => {
    logger.warn({ err, invoiceId }, "Stripe Payment Link creation failed — proceeding without");
    return null;
  });

  const updated = await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status: "SENT",
      clientEmail: input.clientEmail,
      ...(stripeLink && { stripeLink }),
    },
  });

  void sendInvoiceEmail({
    to: input.clientEmail,
    invoiceNumber: existing.number,
    amount: existing.amount.toNumber(),
    currency: existing.currency,
    dueDate: existing.dueDate?.toISOString() ?? null,
    paymentUrl: stripeLink ?? undefined,
  }).catch((err: unknown) => {
    logger.warn({ err, invoiceId }, "Failed to send invoice email");
  });

  return toInvoiceResponse(updated);
}

/**
 * Generates (or refreshes) a Stripe Payment Link for a SENT invoice.
 */
export async function generatePaymentLink(
  tenantId: string,
  invoiceId: string,
): Promise<InvoiceResponse> {
  const existing = await requireInvoiceAccess(tenantId, invoiceId);

  if (existing.status !== "SENT") {
    throw new ForbiddenError("Payment links can only be generated for SENT invoices");
  }

  const amountCents = Math.round(existing.amount.toNumber() * 100);
  const stripeLink = await createPaymentLink({
    invoiceNumber: existing.number,
    amountCents,
    currency: existing.currency,
    description: `Payment for invoice ${existing.number}`,
  });

  if (!stripeLink) {
    throw new ForbiddenError("Stripe is not configured on this server");
  }

  const updated = await prisma.invoice.update({
    where: { id: invoiceId },
    data: { stripeLink },
  });

  return toInvoiceResponse(updated);
}

/**
 * Marks an invoice as PAID (called by Stripe webhook or manually).
 */
export async function markInvoicePaid(
  tenantId: string,
  invoiceId: string,
): Promise<InvoiceResponse> {
  const existing = await requireInvoiceAccess(tenantId, invoiceId);

  if (existing.status === "PAID") return toInvoiceResponse(existing);

  const updated = await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "PAID", paidAt: new Date() },
  });

  if (existing.clientEmail) {
    void sendPaymentReceivedEmail({
      to: existing.clientEmail,
      invoiceNumber: existing.number,
      amount: existing.amount.toNumber(),
      currency: existing.currency,
    }).catch((err: unknown) => {
      logger.warn({ err, invoiceId }, "Failed to send payment received email");
    });
  }

  return toInvoiceResponse(updated);
}

/**
 * Cancels an invoice (DRAFT or SENT → CANCELLED).
 */
export async function cancelInvoice(
  tenantId: string,
  invoiceId: string,
): Promise<InvoiceResponse> {
  const existing = await requireInvoiceAccess(tenantId, invoiceId);

  if (!["DRAFT", "SENT", "OVERDUE"].includes(existing.status)) {
    throw new ForbiddenError("Only DRAFT, SENT, or OVERDUE invoices can be cancelled");
  }

  const updated = await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status: "CANCELLED" },
  });

  return toInvoiceResponse(updated);
}

/**
 * Marks overdue SENT invoices as OVERDUE (run by cron/background job).
 */
export async function markOverdueInvoices(): Promise<number> {
  const result = await prisma.invoice.updateMany({
    where: {
      status: "SENT",
      dueDate: { lt: new Date() },
    },
    data: { status: "OVERDUE" },
  });

  return result.count;
}
