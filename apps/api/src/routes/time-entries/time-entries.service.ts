import { prisma } from "@portalpro/database";
import { NotFoundError, ForbiddenError } from "@portalpro/types";
import type {
  TimeEntryResponse,
  UserResponse,
  CreateTimeEntryInput,
  UpdateTimeEntryInput,
} from "@portalpro/types";

// ===== Serializer =====

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

function toTimeEntryResponse(t: {
  id: string;
  projectId: string;
  taskId: string | null;
  description: string | null;
  minutes: number;
  date: Date;
  billable: boolean;
  createdAt: Date;
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    locale: string;
    timezone: string;
  };
}): TimeEntryResponse {
  return {
    id: t.id,
    projectId: t.projectId,
    taskId: t.taskId,
    user: toUserResponse(t.user),
    description: t.description,
    minutes: t.minutes,
    date: t.date.toISOString(),
    billable: t.billable,
    createdAt: t.createdAt.toISOString(),
  };
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

// ===== Time Entry CRUD =====

/**
 * Lists time entries for a project. Optionally filtered by taskId or userId.
 */
export async function listTimeEntries(
  tenantId: string,
  projectId: string,
  filters?: { taskId?: string; userId?: string },
): Promise<TimeEntryResponse[]> {
  await requireProjectAccess(tenantId, projectId);

  const entries = await prisma.timeEntry.findMany({
    where: {
      projectId,
      ...(filters?.taskId && { taskId: filters.taskId }),
      ...(filters?.userId && { userId: filters.userId }),
    },
    include: { user: true },
    orderBy: { date: "desc" },
  });

  return entries.map(toTimeEntryResponse);
}

/**
 * Gets a single time entry by id.
 */
export async function getTimeEntry(
  tenantId: string,
  entryId: string,
): Promise<TimeEntryResponse> {
  const entry = await prisma.timeEntry.findUnique({
    where: { id: entryId },
    include: {
      user: true,
      project: { select: { tenantId: true } },
    },
  });

  if (!entry || entry.project.tenantId !== tenantId) {
    throw new NotFoundError("TimeEntry", entryId);
  }

  return toTimeEntryResponse(entry);
}

/**
 * Creates a new time entry. Validates the project (and optionally task) exist.
 */
export async function createTimeEntry(
  tenantId: string,
  userId: string,
  input: CreateTimeEntryInput,
): Promise<TimeEntryResponse> {
  await requireProjectAccess(tenantId, input.projectId);

  // Validate task belongs to the project if provided
  if (input.taskId) {
    const task = await prisma.task.findUnique({
      where: { id: input.taskId },
      select: { projectId: true },
    });
    if (!task || task.projectId !== input.projectId) {
      throw new NotFoundError("Task", input.taskId);
    }
  }

  const entry = await prisma.timeEntry.create({
    data: {
      projectId: input.projectId,
      taskId: input.taskId ?? null,
      userId,
      description: input.description ?? null,
      minutes: input.minutes,
      date: input.date,
      billable: input.billable,
    },
    include: { user: true },
  });

  return toTimeEntryResponse(entry);
}

/**
 * Updates a time entry. Only the owner or ADMIN+ can update.
 */
export async function updateTimeEntry(
  tenantId: string,
  entryId: string,
  requesterId: string,
  requesterRole: string,
  input: UpdateTimeEntryInput,
): Promise<TimeEntryResponse> {
  const entry = await prisma.timeEntry.findUnique({
    where: { id: entryId },
    include: { project: { select: { tenantId: true } } },
  });

  if (!entry || entry.project.tenantId !== tenantId) {
    throw new NotFoundError("TimeEntry", entryId);
  }

  const canEdit =
    entry.userId === requesterId || ["OWNER", "ADMIN"].includes(requesterRole);
  if (!canEdit) {
    throw new ForbiddenError("You can only edit your own time entries.");
  }

  const updated = await prisma.timeEntry.update({
    where: { id: entryId },
    data: {
      ...(input.description !== undefined && { description: input.description }),
      ...(input.minutes !== undefined && { minutes: input.minutes }),
      ...(input.date !== undefined && { date: input.date }),
      ...(input.billable !== undefined && { billable: input.billable }),
    },
    include: { user: true },
  });

  return toTimeEntryResponse(updated);
}

/**
 * Deletes a time entry. Only the owner or ADMIN+ can delete.
 */
export async function deleteTimeEntry(
  tenantId: string,
  entryId: string,
  requesterId: string,
  requesterRole: string,
): Promise<void> {
  const entry = await prisma.timeEntry.findUnique({
    where: { id: entryId },
    include: { project: { select: { tenantId: true } } },
  });

  if (!entry || entry.project.tenantId !== tenantId) {
    throw new NotFoundError("TimeEntry", entryId);
  }

  const canDelete =
    entry.userId === requesterId || ["OWNER", "ADMIN"].includes(requesterRole);
  if (!canDelete) {
    throw new ForbiddenError("You can only delete your own time entries.");
  }

  await prisma.timeEntry.delete({ where: { id: entryId } });
}

/**
 * Returns total minutes (billable + non-billable) for a project or task.
 */
export async function getTimeSummary(
  tenantId: string,
  projectId: string,
  taskId?: string,
): Promise<{ totalMinutes: number; billableMinutes: number }> {
  await requireProjectAccess(tenantId, projectId);

  const entries = await prisma.timeEntry.findMany({
    where: { projectId, ...(taskId && { taskId }) },
    select: { minutes: true, billable: true },
  });

  const totalMinutes = entries.reduce((sum, e) => sum + e.minutes, 0);
  const billableMinutes = entries
    .filter((e) => e.billable)
    .reduce((sum, e) => sum + e.minutes, 0);

  return { totalMinutes, billableMinutes };
}
