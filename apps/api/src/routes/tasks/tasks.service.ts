import { prisma } from "@portalpro/database";
import { NotFoundError, ForbiddenError } from "@portalpro/types";
import { broadcastTaskUpdate } from "../../lib/socket";
import type {
  TaskResponse,
  CommentResponse,
  CreateTaskInput,
  UpdateTaskInput,
  CreateCommentInput,
  UserResponse,
} from "@portalpro/types";

// ===== Serializers =====

function toUserResponse(u: {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  locale: string;
  timezone: string;
}): UserResponse {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    avatarUrl: u.avatarUrl,
    locale: u.locale,
    timezone: u.timezone,
  };
}

type RawTask = {
  id: string;
  number: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigneeId: string | null;
  milestoneId: string | null;
  dueDate: Date | null;
  sortOrder: number;
  blockedById: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { comments: number };
};

function toTaskResponse(t: RawTask, assigneeMap?: Map<string, UserResponse>): TaskResponse {
  return {
    id: t.id,
    number: t.number,
    title: t.title,
    description: t.description,
    status: t.status as TaskResponse["status"],
    priority: t.priority as TaskResponse["priority"],
    assigneeId: t.assigneeId,
    assignee: t.assigneeId ? assigneeMap?.get(t.assigneeId) : undefined,
    milestoneId: t.milestoneId,
    dueDate: t.dueDate?.toISOString() ?? null,
    sortOrder: t.sortOrder,
    blockedById: t.blockedById,
    commentCount: t._count?.comments,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

/**
 * Fetches a UserResponse map for the given assignee IDs.
 * Avoids an extra query when there are no assignees.
 */
async function buildAssigneeMap(tasks: RawTask[]): Promise<Map<string, UserResponse>> {
  const ids = [...new Set(tasks.map((t) => t.assigneeId).filter((id): id is string => !!id))];
  if (ids.length === 0) return new Map();

  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, email: true, name: true, avatarUrl: true, locale: true, timezone: true },
  });

  return new Map(users.map((u) => [u.id, toUserResponse(u)]));
}

/**
 * Verifies a project belongs to the tenant.
 */
async function requireProjectAccess(tenantId: string, projectId: string): Promise<void> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { tenantId: true },
  });
  if (!project || project.tenantId !== tenantId) {
    throw new NotFoundError("Project", projectId);
  }
}

// ===== Task CRUD =====

/**
 * Lists all tasks for a project, optionally filtered by status or assignee.
 */
export async function listTasks(
  tenantId: string,
  projectId: string,
  filters?: { status?: string; assigneeId?: string; milestoneId?: string },
): Promise<TaskResponse[]> {
  await requireProjectAccess(tenantId, projectId);

  const tasks = await prisma.task.findMany({
    where: {
      projectId,
      ...(filters?.status && { status: filters.status as any }),
      ...(filters?.assigneeId && { assigneeId: filters.assigneeId }),
      ...(filters?.milestoneId !== undefined && {
        milestoneId: filters.milestoneId || null,
      }),
    },
    select: {
      id: true, number: true, title: true, description: true, status: true, priority: true,
      assigneeId: true, milestoneId: true, dueDate: true, sortOrder: true,
      blockedById: true, createdAt: true, updatedAt: true,
      _count: { select: { comments: true } },
    },
    orderBy: [{ status: "asc" }, { sortOrder: "asc" }],
  });

  const assigneeMap = await buildAssigneeMap(tasks);
  return tasks.map((t) => toTaskResponse(t, assigneeMap));
}

/**
 * Gets a single task by id, with full detail.
 */
export async function getTask(tenantId: string, taskId: string): Promise<TaskResponse> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true, number: true, title: true, description: true, status: true, priority: true,
      assigneeId: true, milestoneId: true, dueDate: true, sortOrder: true,
      blockedById: true, createdAt: true, updatedAt: true,
      projectId: true,
      project: { select: { tenantId: true } },
      _count: { select: { comments: true } },
    },
  });

  if (!task || task.project.tenantId !== tenantId) {
    throw new NotFoundError("Task", taskId);
  }

  const assigneeMap = await buildAssigneeMap([task]);
  return toTaskResponse(task, assigneeMap);
}

/**
 * Creates a new task in a project.
 * Validates milestone and blocker belong to the same project.
 */
export async function createTask(
  tenantId: string,
  projectId: string,
  input: CreateTaskInput,
): Promise<TaskResponse> {
  await requireProjectAccess(tenantId, projectId);

  // Validate milestone belongs to this project
  if (input.milestoneId) {
    const milestone = await prisma.milestone.findUnique({
      where: { id: input.milestoneId },
      select: { projectId: true },
    });
    if (!milestone || milestone.projectId !== projectId) {
      throw new NotFoundError("Milestone", input.milestoneId);
    }
  }

  // Validate blocker task belongs to this project
  if (input.blockedById) {
    const blocker = await prisma.task.findUnique({
      where: { id: input.blockedById },
      select: { projectId: true },
    });
    if (!blocker || blocker.projectId !== projectId) {
      throw new NotFoundError("Task (blocker)", input.blockedById);
    }
  }

  // Auto-assign sortOrder at end of TODO column and sequential task number per project
  const [maxOrder, maxNumber] = await Promise.all([
    prisma.task.aggregate({
      where: { projectId, status: "TODO" },
      _max: { sortOrder: true },
    }),
    prisma.task.aggregate({
      where: { projectId },
      _max: { number: true },
    }),
  ]);
  const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;
  const number = (maxNumber._max.number ?? 0) + 1;

  const task = await prisma.task.create({
    data: {
      projectId,
      number,
      title: input.title,
      description: input.description ?? null,
      milestoneId: input.milestoneId ?? null,
      priority: input.priority ?? "MEDIUM",
      assigneeId: input.assigneeId ?? null,
      dueDate: input.dueDate ?? null,
      blockedById: input.blockedById ?? null,
      sortOrder,
    },
    select: {
      id: true, number: true, title: true, description: true, status: true, priority: true,
      assigneeId: true, milestoneId: true, dueDate: true, sortOrder: true,
      blockedById: true, createdAt: true, updatedAt: true, projectId: true,
      _count: { select: { comments: true } },
    },
  });

  const assigneeMap = await buildAssigneeMap([task]);
  return toTaskResponse(task, assigneeMap);
}

/**
 * Updates a task's fields. Also handles status transitions.
 * Prevents completing a task that is blocked by an open task.
 */
export async function updateTask(
  tenantId: string,
  taskId: string,
  input: UpdateTaskInput,
): Promise<TaskResponse> {
  const existing = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      blockedById: true,
      project: { select: { tenantId: true } },
    },
  });

  if (!existing || existing.project.tenantId !== tenantId) {
    throw new NotFoundError("Task", taskId);
  }

  // Prevent completing a task blocked by an open blocker
  if (input.status === "DONE" && existing.blockedById) {
    const blocker = await prisma.task.findUnique({
      where: { id: existing.blockedById },
      select: { status: true },
    });
    if (blocker && blocker.status !== "DONE") {
      throw new ForbiddenError(
        "Cannot complete this task: it is blocked by an unfinished task.",
      );
    }
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.milestoneId !== undefined && { milestoneId: input.milestoneId }),
      ...(input.assigneeId !== undefined && { assigneeId: input.assigneeId }),
      ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
      ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
      ...(input.blockedById !== undefined && { blockedById: input.blockedById }),
    },
    select: {
      id: true, number: true, title: true, description: true, status: true, priority: true,
      assigneeId: true, milestoneId: true, dueDate: true, sortOrder: true,
      blockedById: true, createdAt: true, updatedAt: true, projectId: true,
      _count: { select: { comments: true } },
    },
  });

  const assigneeMap = await buildAssigneeMap([updated]);
  const response = toTaskResponse(updated, assigneeMap);
  broadcastTaskUpdate(updated.projectId, response);
  return response;
}

/**
 * Deletes a task. Only ADMIN+ can delete.
 */
export async function deleteTask(tenantId: string, taskId: string): Promise<void> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { project: { select: { tenantId: true } } },
  });

  if (!task || task.project.tenantId !== tenantId) {
    throw new NotFoundError("Task", taskId);
  }

  await prisma.task.delete({ where: { id: taskId } });
}

/**
 * Bulk-reorders tasks within a status column.
 */
export async function reorderTasks(
  tenantId: string,
  projectId: string,
  orderedIds: string[],
): Promise<void> {
  await requireProjectAccess(tenantId, projectId);

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.task.update({
        where: { id },
        data: { sortOrder: index },
      }),
    ),
  );
}

// ===== Comments =====

/**
 * Lists all comments for a task, ordered by creation time.
 */
export async function listComments(
  tenantId: string,
  taskId: string,
): Promise<CommentResponse[]> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { project: { select: { tenantId: true } } },
  });

  if (!task || task.project.tenantId !== tenantId) {
    throw new NotFoundError("Task", taskId);
  }

  const comments = await prisma.comment.findMany({
    where: { taskId },
    include: { author: true },
    orderBy: { createdAt: "asc" },
  });

  return comments.map((c) => ({
    id: c.id,
    content: c.content,
    author: toUserResponse(c.author),
    createdAt: c.createdAt.toISOString(),
  }));
}

/**
 * Adds a comment to a task.
 */
export async function createComment(
  tenantId: string,
  taskId: string,
  authorId: string,
  input: CreateCommentInput,
): Promise<CommentResponse> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { project: { select: { tenantId: true } } },
  });

  if (!task || task.project.tenantId !== tenantId) {
    throw new NotFoundError("Task", taskId);
  }

  const comment = await prisma.comment.create({
    data: { taskId, authorId, content: input.content },
    include: { author: true },
  });

  return {
    id: comment.id,
    content: comment.content,
    author: toUserResponse(comment.author),
    createdAt: comment.createdAt.toISOString(),
  };
}

/**
 * Deletes a comment. Authors can delete their own; ADMIN can delete any.
 */
export async function deleteComment(
  tenantId: string,
  commentId: string,
  requesterId: string,
  requesterRole: string,
): Promise<void> {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      authorId: true,
      task: { select: { project: { select: { tenantId: true } } } },
    },
  });

  if (!comment || comment.task.project.tenantId !== tenantId) {
    throw new NotFoundError("Comment", commentId);
  }

  const canDelete =
    comment.authorId === requesterId || ["OWNER", "ADMIN"].includes(requesterRole);
  if (!canDelete) {
    throw new ForbiddenError("You can only delete your own comments.");
  }

  await prisma.comment.delete({ where: { id: commentId } });
}
