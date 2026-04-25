import { prisma } from "@portalpro/database";
import { auth } from "@/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, CheckCircle2, Clock, AlertCircle, XCircle } from "lucide-react";
import { Card, CardContent } from "@portalpro/ui";

interface Props {
  params: { tenantSlug: string; portalSlug: string };
}

export const metadata = { title: "Invoices — Portal" };

const STATUS_CONFIG_MAP: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  DRAFT: { label: "Draft", color: "bg-neutral-100 text-neutral-500", icon: FileText },
  SENT: { label: "Payment Due", color: "bg-blue-100 text-blue-700", icon: Clock },
  PAID: { label: "Paid", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  OVERDUE: { label: "Overdue", color: "bg-red-100 text-red-700", icon: AlertCircle },
  CANCELLED: { label: "Cancelled", color: "bg-neutral-100 text-neutral-400", icon: XCircle },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG_MAP[status] ?? {
    label: status,
    color: "bg-neutral-100 text-neutral-500",
    icon: FileText,
  };
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export default async function PortalInvoicesPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) notFound();

  const portal = await prisma.clientPortal.findFirst({
    where: {
      slug: params.portalSlug,
      tenant: { slug: params.tenantSlug },
    },
    select: {
      id: true,
      name: true,
      tenant: {
        select: {
          invoices: {
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  if (!portal) notFound();

  const invoices = portal.tenant.invoices;

  const outstandingTotal = invoices
    .filter((inv) => ["SENT", "OVERDUE"].includes(inv.status))
    .reduce((sum, inv) => sum + Number(inv.amount), 0);

  const portalBase = `/${params.tenantSlug}/${params.portalSlug}`;

  return (
    <div className="space-y-8">
      {/* Back */}
      <div>
        <Link
          href={portalBase}
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to overview
        </Link>
        <h1 className="text-2xl font-bold text-neutral-800">Invoices</h1>
      </div>

      {/* Summary */}
      {invoices.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <p className="text-xs text-neutral-400 mb-1">Total Invoices</p>
            <p className="text-xl font-bold text-neutral-800">{invoices.length}</p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <p className="text-xs text-neutral-400 mb-1">Amount Outstanding</p>
            <p className={["text-xl font-bold", outstandingTotal > 0 ? "text-amber-600" : "text-neutral-800"].join(" ")}>
              {formatCurrency(outstandingTotal, "GBP")}
            </p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <p className="text-xs text-neutral-400 mb-1">Paid</p>
            <p className="text-xl font-bold text-green-600">
              {invoices.filter((inv) => inv.status === "PAID").length}
            </p>
          </div>
        </div>
      )}

      {/* Invoice list */}
      {invoices.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="h-10 w-10 text-neutral-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-neutral-600">No invoices yet</p>
            <p className="text-xs text-neutral-400 mt-1">
              Invoices from your agency will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => {
            const config = getStatusConfig(inv.status);
            const Icon = config.icon;
            const isPayable = ["SENT", "OVERDUE"].includes(inv.status) && inv.stripeLink;

            return (
              <div
                key={inv.id}
                className="rounded-xl border border-neutral-200 bg-white p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={[
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                          config.color,
                        ].join(" ")}
                      >
                        <Icon className="h-3 w-3" />
                        {config.label}
                      </span>
                      <span className="text-xs text-neutral-400">{inv.number}</span>
                    </div>

                    <div className="flex items-baseline gap-3">
                      <span className="text-2xl font-bold text-neutral-800 tabular-nums">
                        {formatCurrency(Number(inv.amount), inv.currency)}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-xs text-neutral-400">
                      <span>
                        Issued{" "}
                        {new Date(inv.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                      {inv.dueDate && (
                        <span
                          className={
                            inv.status === "OVERDUE" ? "text-red-500 font-medium" : ""
                          }
                        >
                          Due{" "}
                          {new Date(inv.dueDate).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </span>
                      )}
                      {inv.paidAt && (
                        <span className="text-green-600">
                          Paid{" "}
                          {new Date(inv.paidAt).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </span>
                      )}
                    </div>

                    {inv.notes && (
                      <p className="text-xs text-neutral-500 mt-2 leading-relaxed">{inv.notes}</p>
                    )}
                  </div>

                  {/* Pay button */}
                  {isPayable && (
                    <a
                      href={inv.stripeLink!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 px-5 py-2.5 rounded-lg font-semibold text-sm text-white transition-opacity hover:opacity-90"
                      style={{ backgroundColor: "var(--portal-primary, #1B4D6E)" }}
                    >
                      Pay Now
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
