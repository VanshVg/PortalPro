import { requireSession } from "@/lib/session";
import { prisma } from "@portalpro/database";
import { InvoiceManager } from "@/components/invoices/InvoiceManager";

export const metadata = { title: "Invoices — PortalPro" };

export default async function InvoicesPage() {
  const user = await requireSession();
  if (!user.tenantId) return null;

  const [invoices, projects] = await Promise.all([
    prisma.invoice.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.project.findMany({
      where: { tenantId: user.tenantId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const initialInvoices = invoices.map((inv) => ({
    id: inv.id,
    number: inv.number,
    clientEmail: inv.clientEmail,
    amount: Number(inv.amount),
    currency: inv.currency,
    status: inv.status as "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED",
    dueDate: inv.dueDate?.toISOString() ?? null,
    paidAt: inv.paidAt?.toISOString() ?? null,
    stripeLink: inv.stripeLink,
    projectId: inv.projectId,
    notes: inv.notes,
    lineItems: Array.isArray(inv.lineItems) ? inv.lineItems : [],
    createdAt: inv.createdAt.toISOString(),
    updatedAt: inv.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-neutral-800">Invoices</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Create and manage invoices for your clients.
        </p>
      </div>

      <InvoiceManager
        initialInvoices={initialInvoices as never}
        projects={projects}
      />
    </div>
  );
}
