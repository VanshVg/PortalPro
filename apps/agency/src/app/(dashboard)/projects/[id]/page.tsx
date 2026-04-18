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
import { ChevronRight, Calendar, FolderOpen } from "lucide-react";
import { FilesBrowser } from "@/components/projects/FilesBrowser";
import { KanbanBoard } from "@/components/projects/KanbanBoard";
import { MessagingPanel } from "@/components/projects/MessagingPanel";
import { MessagesTabTrigger } from "@/components/projects/MessagesTabTrigger";
import { ProjectSocketListener } from "@/components/projects/ProjectSocketListener";
import { ProjectProgressCard } from "@/components/projects/ProjectProgressCard";
import { ProjectProgressBar } from "@/components/projects/ProjectProgressBar";
import { TimeTracker } from "@/components/projects/TimeTracker";
import { MilestoneManager } from "@/components/projects/MilestoneManager";

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
        include: {
          _count: { select: { tasks: true } },
          tasks: { select: { status: true } },
        },
        orderBy: { sortOrder: "asc" },
      },
      tasks: {
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          priority: true,
          assigneeId: true,
          milestoneId: true,
          dueDate: true,
          sortOrder: true,
          blockedById: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { comments: true } },
        },
        orderBy: { sortOrder: "asc" },
      },
      _count: { select: { tasks: true, files: true } },
    },
  });

  if (!project || project.tenantId !== user.tenantId) notFound();

  // Fetch team members, assignee names, and unread message count in parallel
  const [teamMembers, assigneeUsers, unreadMessageCount] = await Promise.all([
    prisma.tenantMember.findMany({
      where: { tenantId: user.tenantId },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    }),
    prisma.user.findMany({
      where: {
        id: {
          in: project.tasks
            .map((t) => t.assigneeId)
            .filter((id): id is string => id !== null),
        },
      },
      select: { id: true, email: true, name: true, avatarUrl: true, locale: true, timezone: true },
    }),
    prisma.message.count({
      where: { projectId: params.id, threadId: null, isRead: false, authorId: { not: user.id } },
    }),
  ]);

  const assigneeMap = new Map(assigneeUsers.map((u) => [u.id, u]));

  const allTaskCount = project._count.tasks;
  const doneCount = project.tasks.filter((t) => t.status === "DONE").length;
  const progress =
    allTaskCount === 0 ? 0 : Math.round((doneCount / allTaskCount) * 100);

  // Shape tasks for the Kanban board (matches TaskResponse interface)
  const kanbanTasks = project.tasks.map((t) => {
    const assignee = t.assigneeId ? assigneeMap.get(t.assigneeId) : undefined;
    return {
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status as "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE",
      priority: t.priority as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
      assigneeId: t.assigneeId,
      assignee: assignee
        ? {
            id: assignee.id,
            email: assignee.email,
            name: assignee.name,
            avatarUrl: assignee.avatarUrl,
            locale: assignee.locale,
            timezone: assignee.timezone,
          }
        : undefined,
      milestoneId: t.milestoneId,
      dueDate: t.dueDate?.toISOString() ?? null,
      sortOrder: t.sortOrder,
      blockedById: t.blockedById,
      commentCount: t._count.comments,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };
  });

  const members = teamMembers.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    avatarUrl: m.user.avatarUrl,
  }));

  return (
    <div className="space-y-8">
      {/* Persistent socket connection — stays alive regardless of which tab is active */}
      <ProjectSocketListener projectId={project.id} currentUserId={user.id} />

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
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {/* Progress card — reactive to Kanban task moves (no refresh needed) */}
        <ProjectProgressCard
          projectId={project.id}
          initialProgress={progress}
          initialDoneCount={doneCount}
          allTaskCount={allTaskCount}
        />
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-neutral-400 mb-2">
              <FolderOpen className="h-4 w-4" />
              <span className="text-xs">Files</span>
            </div>
            <div className="text-2xl font-bold text-neutral-800">{project._count.files}</div>
            <div className="text-xs text-neutral-400 mt-0.5">uploaded</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-neutral-400 mb-2">
              <Calendar className="h-4 w-4" />
              <span className="text-xs">Due date</span>
            </div>
            <div className="text-2xl font-bold text-neutral-800">
              {project.endDate
                ? new Date(project.endDate).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : "—"}
            </div>
            <div className="text-xs text-neutral-400 mt-0.5">
              {project.startDate
                ? `Started ${new Date(project.startDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`
                : "No start date"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress bar — reactive to Kanban task moves */}
      <ProjectProgressBar projectId={project.id} initialProgress={progress} />

      {/* Tabs */}
      <Tabs defaultValue="tasks">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">
            Tasks {allTaskCount > 0 && `(${allTaskCount})`}
          </TabsTrigger>
          <TabsTrigger value="files">
            Files {project._count.files > 0 && `(${project._count.files})`}
          </TabsTrigger>
          <MessagesTabTrigger projectId={project.id} initialUnread={unreadMessageCount} />
          <TabsTrigger value="time">Time</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Milestones — full management UI */}
          <MilestoneManager
            projectId={project.id}
            initialMilestones={project.milestones.map((m) => ({
              id: m.id,
              title: m.title,
              description: m.description,
              dueDate: m.dueDate?.toISOString() ?? null,
              sortOrder: m.sortOrder,
              isCompleted: m.isCompleted,
              taskCount: m._count.tasks,
              completedTaskCount: m.tasks.filter((t) => t.status === "DONE").length,
            }))}
            canEdit={["OWNER", "ADMIN", "EDITOR"].includes(user.role ?? "")}
          />

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

        <TabsContent value="tasks" className="mt-6">
          <KanbanBoard
            projectId={project.id}
            initialTasks={kanbanTasks}
            userRole={user.role ?? "VIEWER"}
            members={members}
          />
        </TabsContent>

        <TabsContent value="files" className="mt-6">
          <FilesBrowser projectId={project.id} userRole={user.role} />
        </TabsContent>

        <TabsContent value="messages" className="mt-6">
          <MessagingPanel projectId={project.id} currentUserId={user.id} currentUserName={user.name} />
        </TabsContent>

        <TabsContent value="time" className="mt-6">
          <TimeTracker projectId={project.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
