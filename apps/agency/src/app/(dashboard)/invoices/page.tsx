import { Suspense } from "react";
import { requireSession } from "@/lib/session";
import { prisma } from "@portalpro/database";
import { Skeleton } from "@portalpro/ui";
import { InvoiceManager } from "@/components/invoices/InvoiceManager";

export const metadata = { title: "Invoices — PortalPro" };

export default async function InvoicesPage() {
  const user = await requireSession();
  if (!user.tenantId) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-neutral-800">Invoices</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Create and manage invoices for your clients.
        </p>
      </div>

      <Suspense fallback={<InvoiceSkeleton />}>
        <InvoiceData tenantId={user.tenantId} />
      </Suspense>
    </div>
  );
}

async function InvoiceData({ tenantId }: { tenantId: string }) {
  const [invoices, projects] = await Promise.all([
    prisma.invoice.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.project.findMany({
      where: { tenantId },
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

  return <InvoiceManager initialInvoices={initialInvoices as never} projects={projects} />;
}

function InvoiceSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-20 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-10 w-36 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-neutral-200 bg-white p-5 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-28" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-neutral-200 bg-white">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between border-b border-neutral-50 p-4 last:border-b-0">
            <div className="space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-40" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
