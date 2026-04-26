import { Suspense } from "react";
import { requireSession } from "@/lib/session";
import { prisma } from "@portalpro/database";
import { EmptyState, Skeleton } from "@portalpro/ui";
import { FolderOpen } from "lucide-react";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { CreateProjectButton } from "@/components/projects/CreateProjectButton";

export const metadata = { title: "Projects — PortalPro" };

export default async function ProjectsPage() {
  const user = await requireSession();
  if (!user.tenantId) return null;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-800">Projects</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Manage all client projects across your portals.
          </p>
        </div>
        <Suspense fallback={<Skeleton className="h-10 w-36 rounded-lg" />}>
          <CreateButton tenantId={user.tenantId} userRole={user.role} />
        </Suspense>
      </div>

      <Suspense fallback={<ProjectsListSkeleton />}>
        <ProjectsList tenantId={user.tenantId} userRole={user.role} />
      </Suspense>
    </div>
  );
}

async function CreateButton({
  tenantId,
  userRole,
}: {
  tenantId: string;
  userRole: string | null;
}) {
  const portals = await prisma.clientPortal.findMany({
    where: { tenantId, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return <CreateProjectButton portals={portals} userRole={userRole} />;
}

async function ProjectsList({
  tenantId,
  userRole,
}: {
  tenantId: string;
  userRole: string | null;
}) {
  // Two lean queries in parallel — the projects rows + per-project DONE counts.
  // Replaces the previous `tasks: { select: { status: true } }` include which
  // loaded every task row across every project.
  const [projects, doneCounts, portals] = await Promise.all([
    prisma.project.findMany({
      where: { tenantId },
      include: {
        clientPortal: { select: { id: true, name: true, primaryColor: true } },
        _count: { select: { tasks: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.task.groupBy({
      by: ["projectId"],
      where: { project: { tenantId }, status: "DONE" },
      _count: true,
    }),
    prisma.clientPortal.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const doneByProject = new Map(doneCounts.map((d) => [d.projectId, d._count]));

  if (projects.length === 0) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="No projects yet"
        description="Create a project and assign it to a client portal to get started."
        action={<CreateProjectButton portals={portals} variant="outline" userRole={userRole} />}
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => {
        const total = project._count.tasks;
        const done = doneByProject.get(project.id) ?? 0;
        const progress = total === 0 ? 0 : Math.round((done / total) * 100);

        return (
          <ProjectCard
            key={project.id}
            project={{
              id: project.id,
              name: project.name,
              status: project.status,
              startDate: project.startDate?.toISOString() ?? null,
              endDate: project.endDate?.toISOString() ?? null,
              taskCount: total,
              progress,
              clientPortal: project.clientPortal,
            }}
          />
        );
      })}
    </div>
  );
}

function ProjectsListSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
          <div className="flex items-start justify-between">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="flex items-center gap-3 pt-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}
