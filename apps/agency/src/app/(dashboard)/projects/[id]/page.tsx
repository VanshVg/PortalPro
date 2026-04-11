import { requireSession } from "@/lib/session";
import { prisma } from "@portalpro/database";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  ProjectStatusBadge,
} from "@portalpro/ui";
import { ChevronRight, Calendar, CheckSquare, FolderOpen, MessageSquare } from "lucide-react";
import { FilesBrowser } from "@/components/projects/FilesBrowser";

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props) {
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { name: true },
  });
  return { title: `${project?.name ?? "Project"} — PortalPro` };
}

export default async function ProjectDetailPage({ params }: Props) {
  const user = await requireSession();
  if (!user.tenantId) notFound();

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      clientPortal: { select: { id: true, name: true } },
      milestones: {
        include: { _count: { select: { tasks: true } } },
        orderBy: { sortOrder: "asc" },
      },
      tasks: {
        select: { id: true, title: true, status: true, priority: true, dueDate: true },
        orderBy: { sortOrder: "asc" },
        take: 10,
      },
      _count: { select: { tasks: true, files: true, messages: true } },
    },
  });

  if (!project || project.tenantId !== user.tenantId) notFound();

  const allTaskCount = project._count.tasks;
  const doneCount = project.tasks.filter((t) => t.status === "DONE").length;
  const progress =
    allTaskCount === 0 ? 0 : Math.round((doneCount / allTaskCount) * 100);

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-neutral-500">
        <Link href="/projects" className="hover:text-neutral-800 transition-colors">
          Projects
        </Link>
        <ChevronRight className="h-4 w-4" />
        <Link
          href={`/clients/${project.clientPortal.id}`}
          className="hover:text-neutral-800 transition-colors"
        >
          {project.clientPortal.name}
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-neutral-800 font-medium">{project.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-neutral-800">{project.name}</h1>
            <ProjectStatusBadge status={project.status as any} />
          </div>
          {project.description && (
            <p className="text-sm text-neutral-500 max-w-2xl">{project.description}</p>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            label: "Progress",
            value: `${progress}%`,
            icon: CheckSquare,
            sub: `${doneCount}/${allTaskCount} tasks done`,
          },
          {
            label: "Files",
            value: project._count.files.toString(),
            icon: FolderOpen,
            sub: "uploaded",
          },
          {
            label: "Messages",
            value: project._count.messages.toString(),
            icon: MessageSquare,
            sub: "in thread",
          },
          {
            label: "Due date",
            value: project.endDate
              ? new Date(project.endDate).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "—",
            icon: Calendar,
            sub: project.startDate
              ? `Started ${new Date(project.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
              : "No start date",
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 text-neutral-400 mb-2">
                <stat.icon className="h-4 w-4" />
                <span className="text-xs">{stat.label}</span>
              </div>
              <div className="text-2xl font-bold text-neutral-800">{stat.value}</div>
              <div className="text-xs text-neutral-400 mt-0.5">{stat.sub}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full rounded-full bg-neutral-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-[#1B4D6E] transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="files">
            Files {project._count.files > 0 && `(${project._count.files})`}
          </TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Milestones */}
          {project.milestones.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Milestones</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-neutral-100">
                  {project.milestones.map((m) => (
                    <div key={m.id} className="px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={[
                            "h-2.5 w-2.5 rounded-full flex-shrink-0",
                            m.isCompleted ? "bg-green-500" : "bg-neutral-300",
                          ].join(" ")}
                        />
                        <div>
                          <div
                            className={[
                              "text-sm font-medium",
                              m.isCompleted
                                ? "text-neutral-400 line-through"
                                : "text-neutral-800",
                            ].join(" ")}
                          >
                            {m.title}
                          </div>
                          {m.dueDate && (
                            <div className="text-xs text-neutral-400">
                              Due{" "}
                              {new Date(m.dueDate).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "short",
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-neutral-400">
                        {m._count.tasks} task{m._count.tasks !== 1 ? "s" : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent tasks */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent tasks</CardTitle>
              <span className="text-xs text-neutral-400">{allTaskCount} total</span>
            </CardHeader>
            <CardContent className="p-0">
              {project.tasks.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-neutral-400">
                  No tasks yet. Tasks will be added in Phase 3 (Kanban board).
                </div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {project.tasks.map((task) => (
                    <div key={task.id} className="px-6 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={[
                            "h-2 w-2 rounded-full flex-shrink-0",
                            task.status === "DONE"
                              ? "bg-green-500"
                              : task.status === "IN_PROGRESS"
                                ? "bg-blue-500"
                                : task.status === "IN_REVIEW"
                                  ? "bg-amber-500"
                                  : "bg-neutral-300",
                          ].join(" ")}
                        />
                        <span
                          className={[
                            "text-sm",
                            task.status === "DONE"
                              ? "text-neutral-400 line-through"
                              : "text-neutral-800",
                          ].join(" ")}
                        >
                          {task.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-neutral-400">
                        {task.dueDate && (
                          <span>
                            {new Date(task.dueDate).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        )}
                        <span
                          className={[
                            "rounded px-1.5 py-0.5",
                            task.priority === "URGENT"
                              ? "bg-red-100 text-red-600"
                              : task.priority === "HIGH"
                                ? "bg-orange-100 text-orange-600"
                                : task.priority === "LOW"
                                  ? "bg-neutral-100 text-neutral-500"
                                  : "bg-blue-100 text-blue-600",
                          ].join(" ")}
                        >
                          {task.priority}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files" className="mt-6">
          <FilesBrowser projectId={project.id} userRole={user.role} />
        </TabsContent>

        <TabsContent value="messages" className="mt-6">
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-10 w-10 text-neutral-300 mx-auto mb-3" />
              <p className="text-sm text-neutral-500">
                Threaded messaging will be available in Phase 3.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
