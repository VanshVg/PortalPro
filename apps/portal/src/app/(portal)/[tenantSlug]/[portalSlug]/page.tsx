import { Suspense } from "react";
import { prisma } from "@portalpro/database";
import { auth } from "@/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, Badge, Skeleton } from "@portalpro/ui";
import { FolderOpen, CheckSquare, MessageSquare, Clock, FileText } from "lucide-react";

interface PortalDashboardProps {
  params: { tenantSlug: string; portalSlug: string };
}

export async function generateMetadata({ params }: PortalDashboardProps) {
  const portal = await prisma.clientPortal.findFirst({
    where: { slug: params.portalSlug, tenant: { slug: params.tenantSlug } },
    select: { name: true },
  });
  return { title: portal?.name ?? "Portal Dashboard" };
}

export default async function PortalDashboardPage({ params }: PortalDashboardProps) {
  const session = await auth();
  if (!session?.user) notFound();

  const firstName = session.user.name.split(" ")[0] ?? session.user.name;

  return (
    <div className="space-y-8">
      <Suspense fallback={<DashboardSkeleton firstName={firstName} />}>
        <DashboardContent params={params} firstName={firstName} />
      </Suspense>
    </div>
  );
}

async function DashboardContent({
  params,
  firstName,
}: {
  params: { tenantSlug: string; portalSlug: string };
  firstName: string;
}) {
  const portal = await prisma.clientPortal.findFirst({
    where: { slug: params.portalSlug, tenant: { slug: params.tenantSlug } },
    select: {
      id: true,
      name: true,
      tenant: {
        select: {
          invoices: {
            where: { status: { in: ["SENT", "OVERDUE"] } },
            select: { id: true },
          },
        },
      },
    },
  });
  if (!portal) notFound();

  // Load projects + aggregate DONE task counts in parallel — avoids loading
  // all task rows just to compute progress percentages.
  const [projects, doneCounts] = await Promise.all([
    prisma.project.findMany({
      where: { clientPortalId: portal.id },
      select: {
        id: true,
        name: true,
        status: true,
        endDate: true,
        _count: { select: { tasks: true, messages: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.task.groupBy({
      by: ["projectId"],
      where: { project: { clientPortalId: portal.id }, status: "DONE" },
      _count: true,
    }),
  ]);

  const doneByProject = new Map(doneCounts.map((d) => [d.projectId, d._count]));
  const totalDone = doneCounts.reduce((sum, d) => sum + d._count, 0);
  const totalTasks = projects.reduce((sum, p) => sum + p._count.tasks, 0);
  const totalMessages = projects.reduce((sum, p) => sum + p._count.messages, 0);
  const pendingInvoiceCount = portal.tenant.invoices.length;

  const stats = [
    { title: "Active Projects", value: projects.filter((p) => p.status === "ACTIVE").length, icon: FolderOpen },
    { title: "Tasks Completed", value: totalDone, icon: CheckSquare },
    { title: "Total Tasks", value: totalTasks, icon: Clock },
    { title: "Messages", value: totalMessages, icon: MessageSquare },
  ];

  const statusColors: Record<string, string> = {
    ACTIVE: "primary",
    DRAFT: "default",
    ON_HOLD: "warning",
    COMPLETED: "success",
    ARCHIVED: "default",
  };

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold text-neutral-800">Welcome back, {firstName}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Here&apos;s an overview of your {portal.name} projects.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-neutral-500">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-neutral-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-neutral-800">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Projects */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-neutral-800">Your Projects</h2>
        {projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 py-16 text-center">
            <FolderOpen className="mx-auto mb-3 h-10 w-10 text-neutral-300" />
            <p className="text-sm text-neutral-500">No projects yet. Your agency will add them soon.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {projects.map((project) => {
              const done = doneByProject.get(project.id) ?? 0;
              const total = project._count.tasks;
              const progress = total > 0 ? Math.round((done / total) * 100) : 0;

              return (
                <Link
                  key={project.id}
                  href={`/${params.tenantSlug}/${params.portalSlug}/projects/${project.id}`}
                >
                  <Card className="hover:border-neutral-300 hover:shadow-sm transition-all cursor-pointer">
                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                      <CardTitle className="text-base font-semibold text-neutral-800 leading-snug">
                        {project.name}
                      </CardTitle>
                      <Badge
                        variant={
                          (statusColors[project.status] ?? "default") as
                            | "default"
                            | "primary"
                            | "success"
                            | "warning"
                            | "error"
                            | "info"
                            | "accent"
                        }
                      >
                        {project.status.replace("_", " ")}
                      </Badge>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {total > 0 && (
                        <div>
                          <div className="mb-1 flex items-center justify-between text-xs text-neutral-500">
                            <span>{done}/{total} tasks done</span>
                            <span>{progress}%</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${progress}%`,
                                backgroundColor: "var(--portal-primary, #1B4D6E)",
                              }}
                            />
                          </div>
                        </div>
                      )}
                      {project.endDate && (
                        <p className="text-xs text-neutral-400">
                          Due:{" "}
                          {new Date(project.endDate).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Invoices quick link */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-neutral-800">Billing</h2>
        <Link href={`/${params.tenantSlug}/${params.portalSlug}/invoices`}>
          <div className="rounded-xl border border-neutral-200 bg-white p-5 flex items-center justify-between hover:border-neutral-300 hover:shadow-sm transition-all cursor-pointer">
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: "var(--portal-primary-light, #f0f7ff)" }}
              >
                <FileText className="h-5 w-5" style={{ color: "var(--portal-primary, #1B4D6E)" }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-800">Invoices</p>
                <p className="text-xs text-neutral-400">
                  {pendingInvoiceCount > 0
                    ? `${pendingInvoiceCount} invoice${pendingInvoiceCount > 1 ? "s" : ""} awaiting payment`
                    : "View your invoices and payment history"}
                </p>
              </div>
            </div>
            {pendingInvoiceCount > 0 && (
              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                {pendingInvoiceCount}
              </span>
            )}
          </div>
        </Link>
      </div>
    </>
  );
}

function DashboardSkeleton({ firstName }: { firstName: string }) {
  return (
    <>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-neutral-800">Welcome back, {firstName}</h1>
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-neutral-200 bg-white p-5">
            <Skeleton className="h-3 w-24 mb-3" />
            <Skeleton className="h-7 w-12" />
          </div>
        ))}
      </div>

      <div>
        <Skeleton className="h-6 w-36 mb-4" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
              <div className="flex items-start justify-between">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
              <Skeleton className="h-3 w-28" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
