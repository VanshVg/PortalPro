import { prisma } from "@portalpro/database";
import { auth } from "@/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@portalpro/ui";
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { PortalMessagesLink } from "@/components/PortalMessagesLink";

interface Props {
  params: { tenantSlug: string; portalSlug: string; projectId: string };
}

export async function generateMetadata({ params }: Props) {
  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
    select: { name: true },
  });
  return { title: `${project?.name ?? "Project"} — Portal` };
}

const STATUS_ICON: Record<string, React.ElementType> = {
  DONE: CheckCircle2,
  IN_REVIEW: Clock,
  IN_PROGRESS: Clock,
  TODO: Circle,
};

const STATUS_COLOR: Record<string, string> = {
  DONE: "text-green-500",
  IN_REVIEW: "text-amber-500",
  IN_PROGRESS: "text-blue-500",
  TODO: "text-neutral-300",
};

const STATUS_LABEL: Record<string, string> = {
  DONE: "Done",
  IN_REVIEW: "In Review",
  IN_PROGRESS: "In Progress",
  TODO: "To Do",
};

const PRIORITY_COLOR: Record<string, string> = {
  URGENT: "text-red-600 bg-red-50",
  HIGH: "text-orange-600 bg-orange-50",
  MEDIUM: "text-blue-600 bg-blue-50",
  LOW: "text-neutral-500 bg-neutral-50",
};

export default async function PortalProjectPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) notFound();

  // Verify portal & project access
  const portal = await prisma.clientPortal.findFirst({
    where: {
      slug: params.portalSlug,
      tenant: { slug: params.tenantSlug },
    },
    select: { id: true, name: true },
  });
  if (!portal) notFound();

  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
    include: {
      milestones: {
        include: {
          tasks: {
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
              dueDate: true,
            },
            orderBy: { sortOrder: "asc" },
          },
        },
        orderBy: { sortOrder: "asc" },
      },
      tasks: {
        where: { milestoneId: null },
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
        },
        orderBy: { sortOrder: "asc" },
      },
      _count: { select: { tasks: true } },
    },
  });

  if (!project || project.clientPortalId !== portal.id) notFound();

  const unreadMessageCount = await prisma.message.count({
    where: {
      projectId: params.projectId,
      threadId: null,
      isRead: false,
      authorId: { not: session.user.id },
    },
  });

  const allTasks = [
    ...project.milestones.flatMap((m) => m.tasks),
    ...project.tasks,
  ];
  const doneCount = allTasks.filter((t) => t.status === "DONE").length;
  const progress =
    allTasks.length === 0 ? 0 : Math.round((doneCount / allTasks.length) * 100);

  const portalBase = `/${params.tenantSlug}/${params.portalSlug}`;

  return (
    <div className="space-y-8">
      {/* Back + breadcrumb */}
      <div>
        <Link
          href={portalBase}
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to overview
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-800">{project.name}</h1>
            {project.description && (
              <p className="mt-1 text-sm text-neutral-500 max-w-2xl">{project.description}</p>
            )}
          </div>
          <span
            className={[
              "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
              project.status === "ACTIVE"
                ? "bg-green-100 text-green-700"
                : project.status === "ON_HOLD"
                  ? "bg-amber-100 text-amber-700"
                  : project.status === "COMPLETED"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-neutral-100 text-neutral-600",
            ].join(" ")}
          >
            {project.status.replace("_", " ")}
          </span>
        </div>
      </div>

      {/* Overall progress */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-neutral-700">Overall Progress</span>
            <span className="text-2xl font-bold text-neutral-800">{progress}%</span>
          </div>
          <div className="h-3 w-full rounded-full bg-neutral-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                backgroundColor: "var(--portal-primary, #1B4D6E)",
              }}
            />
          </div>
          <p className="mt-2 text-xs text-neutral-400">
            {doneCount} of {allTasks.length} tasks completed
          </p>
        </CardContent>
      </Card>

      {/* Milestone Timeline */}
      {project.milestones.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-neutral-800 mb-4">Milestones</h2>

          {/* Horizontal timeline bar */}
          <div className="relative mb-6">
            {/* Track */}
            <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${
                    project.milestones.length === 0
                      ? 0
                      : Math.round(
                          (project.milestones.filter((m) => m.isCompleted).length /
                            project.milestones.length) *
                            100,
                        )
                  }%`,
                  backgroundColor: "var(--portal-primary, #1B4D6E)",
                }}
              />
            </div>

            {/* Milestone dots */}
            <div className="flex justify-between mt-3">
              {project.milestones.map((m) => {
                const mDone = m.tasks.filter((t) => t.status === "DONE").length;
                const mTotal = m.tasks.length;
                const mProgress = mTotal === 0 ? 0 : Math.round((mDone / mTotal) * 100);
                return (
                  <div key={m.id} className="flex flex-col items-center gap-1 flex-1 first:items-start last:items-end">
                    <div
                      className={[
                        "h-3 w-3 rounded-full border-2",
                        m.isCompleted
                          ? "border-green-500 bg-green-500"
                          : "border-neutral-300 bg-white",
                      ].join(" ")}
                    />
                    <span className="text-[10px] text-neutral-500 font-medium truncate max-w-[80px] text-center">
                      {m.title}
                    </span>
                    {mTotal > 0 && (
                      <span className="text-[9px] text-neutral-400">
                        {mProgress}%
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Milestone cards */}
          <div className="space-y-4">
            {project.milestones.map((m) => {
              const mDone = m.tasks.filter((t) => t.status === "DONE").length;
              const mTotal = m.tasks.length;
              const mProgress = mTotal === 0 ? 0 : Math.round((mDone / mTotal) * 100);

              return (
                <Card key={m.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {m.isCompleted ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 text-neutral-300 flex-shrink-0" />
                        )}
                        <CardTitle
                          className={m.isCompleted ? "text-neutral-400 line-through" : ""}
                        >
                          {m.title}
                        </CardTitle>
                      </div>
                      {m.dueDate && (
                        <span className="text-xs text-neutral-400 flex-shrink-0">
                          Due{" "}
                          {new Date(m.dueDate).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      )}
                    </div>

                    {/* Milestone progress bar */}
                    {mTotal > 0 && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-1">
                          <span>{mDone}/{mTotal} tasks</span>
                          <span>{mProgress}%</span>
                        </div>
                        <div className="h-1 w-full rounded-full bg-neutral-100 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${mProgress}%`,
                              backgroundColor: "var(--portal-primary, #1B4D6E)",
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </CardHeader>

                  {/* Task list (read-only) */}
                  {m.tasks.length > 0 && (
                    <CardContent className="p-0">
                      <div className="divide-y divide-neutral-50">
                        {m.tasks.map((task) => {
                          const Icon = STATUS_ICON[task.status] ?? Circle;
                          const isOverdue =
                            task.dueDate &&
                            task.status !== "DONE" &&
                            new Date(task.dueDate) < new Date();
                          return (
                            <div
                              key={task.id}
                              className="flex items-center gap-3 px-6 py-2.5"
                            >
                              <Icon
                                className={`h-3.5 w-3.5 flex-shrink-0 ${STATUS_COLOR[task.status] ?? ""}`}
                              />
                              <span
                                className={[
                                  "flex-1 text-sm truncate",
                                  task.status === "DONE"
                                    ? "text-neutral-400 line-through"
                                    : "text-neutral-700",
                                ].join(" ")}
                              >
                                {task.title}
                              </span>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {task.dueDate && (
                                  <span
                                    className={[
                                      "text-[10px]",
                                      isOverdue
                                        ? "text-red-500 font-medium flex items-center gap-0.5"
                                        : "text-neutral-400",
                                    ].join(" ")}
                                  >
                                    {isOverdue && <AlertCircle className="h-2.5 w-2.5" />}
                                    {new Date(task.dueDate).toLocaleDateString("en-GB", {
                                      day: "numeric",
                                      month: "short",
                                    })}
                                  </span>
                                )}
                                <span
                                  className={[
                                    "text-[10px] rounded px-1.5 py-0.5 font-medium",
                                    PRIORITY_COLOR[task.priority] ?? "",
                                  ].join(" ")}
                                >
                                  {task.priority}
                                </span>
                                <span className="text-[10px] text-neutral-400 hidden sm:inline">
                                  {STATUS_LABEL[task.status]}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Unassigned tasks (no milestone) */}
      {project.tasks.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-neutral-800 mb-4">
            Other Tasks
          </h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-neutral-100">
                {project.tasks.map((task) => {
                  const Icon = STATUS_ICON[task.status] ?? Circle;
                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 px-6 py-3"
                    >
                      <Icon
                        className={`h-3.5 w-3.5 flex-shrink-0 ${STATUS_COLOR[task.status] ?? ""}`}
                      />
                      <span
                        className={[
                          "flex-1 text-sm",
                          task.status === "DONE"
                            ? "text-neutral-400 line-through"
                            : "text-neutral-700",
                        ].join(" ")}
                      >
                        {task.title}
                      </span>
                      <span className="text-xs text-neutral-400">
                        {STATUS_LABEL[task.status]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty state */}
      {project.milestones.length === 0 && project.tasks.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <Circle className="h-10 w-10 text-neutral-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-neutral-600">No tasks yet</p>
            <p className="text-xs text-neutral-400 mt-1">
              Your agency is setting up the project plan.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Messages link — shows unread dot when new messages arrive */}
      <PortalMessagesLink
        projectId={project.id}
        href={`${portalBase}/projects/${params.projectId}/messages`}
        initialUnread={unreadMessageCount}
        currentUserId={session.user.id}
      />
    </div>
  );
}
