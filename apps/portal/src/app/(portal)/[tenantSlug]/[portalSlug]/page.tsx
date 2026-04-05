import { prisma } from "@portalpro/database";
import { auth } from "@/auth";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@portalpro/ui";
import { FolderOpen, CheckSquare, MessageSquare, Clock } from "lucide-react";

interface PortalDashboardProps {
  params: { tenantSlug: string; portalSlug: string };
}

export async function generateMetadata({ params }: PortalDashboardProps) {
  const portal = await prisma.clientPortal.findFirst({
    where: {
      slug: params.portalSlug,
      tenant: { slug: params.tenantSlug },
    },
    select: { name: true },
  });
  return { title: portal?.name ?? "Portal Dashboard" };
}

export default async function PortalDashboardPage({ params }: PortalDashboardProps) {
  const session = await auth();
  if (!session?.user) notFound();

  const portal = await prisma.clientPortal.findFirst({
    where: {
      slug: params.portalSlug,
      tenant: { slug: params.tenantSlug },
    },
    select: { id: true, name: true },
  });
  if (!portal) notFound();

  // Load projects for this portal
  const projects = await prisma.project.findMany({
    where: { clientPortalId: portal.id },
    select: {
      id: true,
      name: true,
      status: true,
      startDate: true,
      endDate: true,
      tasks: {
        select: { status: true },
      },
      _count: {
        select: { messages: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const stats = [
    {
      title: "Active Projects",
      value: projects.filter((p) => p.status === "ACTIVE").length,
      icon: FolderOpen,
    },
    {
      title: "Tasks Completed",
      value: projects.flatMap((p) => p.tasks).filter((t) => t.status === "DONE").length,
      icon: CheckSquare,
    },
    {
      title: "Total Tasks",
      value: projects.flatMap((p) => p.tasks).length,
      icon: Clock,
    },
    {
      title: "Messages",
      value: projects.reduce((acc, p) => acc + p._count.messages, 0),
      icon: MessageSquare,
    },
  ];

  const statusColors: Record<string, string> = {
    ACTIVE: "primary",
    DRAFT: "default",
    ON_HOLD: "warning",
    COMPLETED: "success",
    ARCHIVED: "default",
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-neutral-800">Welcome back, {session.user.name.split(" ")[0]}</h1>
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
              const done = project.tasks.filter((t) => t.status === "DONE").length;
              const total = project.tasks.length;
              const progress = total > 0 ? Math.round((done / total) * 100) : 0;

              return (
                <Card key={project.id} className="hover:border-neutral-300 transition-colors cursor-pointer">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                    <CardTitle className="text-base font-semibold text-neutral-800 leading-snug">
                      {project.name}
                    </CardTitle>
                    <Badge variant={(statusColors[project.status] ?? "default") as "default" | "primary" | "success" | "warning" | "error" | "info" | "accent"}>
                      {project.status.replace("_", " ")}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Progress bar */}
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
