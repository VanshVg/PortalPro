import { requireSession } from "@/lib/session";
import { prisma } from "@portalpro/database";
import { EmptyState } from "@portalpro/ui";
import { FolderOpen } from "lucide-react";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { CreateProjectButton } from "@/components/projects/CreateProjectButton";

export const metadata = { title: "Projects — PortalPro" };

export default async function ProjectsPage() {
  const user = await requireSession();
  if (!user.tenantId) return null;

  const [projects, portals] = await Promise.all([
    prisma.project.findMany({
      where: { tenantId: user.tenantId },
      include: {
        clientPortal: { select: { id: true, name: true, primaryColor: true } },
        _count: { select: { tasks: true } },
        tasks: { select: { status: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.clientPortal.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-800">Projects</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Manage all client projects across your portals.
          </p>
        </div>
        <CreateProjectButton portals={portals} userRole={user.role} />
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No projects yet"
          description="Create a project and assign it to a client portal to get started."
          action={<CreateProjectButton portals={portals} variant="outline" userRole={user.role} />}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => {
            const total = project._count.tasks;
            const done = project.tasks.filter((t) => t.status === "DONE").length;
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
      )}
    </div>
  );
}
