import { prisma } from "@portalpro/database";
import { NotFoundError } from "@portalpro/types";
import type {
  MilestoneResponse,
  CreateMilestoneInput,
  UpdateMilestoneInput,
  ReorderMilestonesInput,
} from "@portalpro/types";

/**
 * Serializes a Milestone record to a MilestoneResponse DTO.
 */
function toMilestoneResponse(m: {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  sortOrder: number;
  isCompleted: boolean;
  _count?: { tasks: number };
  tasks?: { status: string }[];
}): MilestoneResponse {
  const taskCount = m._count?.tasks ?? m.tasks?.length ?? 0;
  const completedTaskCount = m.tasks?.filter((t) => t.status === "DONE").length;
  return {
    id: m.id,
    title: m.title,
    description: m.description,
    dueDate: m.dueDate?.toISOString() ?? null,
    sortOrder: m.sortOrder,
    isCompleted: m.isCompleted,
    taskCount,
    completedTaskCount,
  };
}

/**
 * Verifies a project belongs to the tenant and returns the project id.
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

/**
 * Lists all milestones for a project, ordered by sortOrder.
 */
export async function listMilestones(
  tenantId: string,
  projectId: string,
): Promise<MilestoneResponse[]> {
  await requireProjectAccess(tenantId, projectId);

  const milestones = await prisma.milestone.findMany({
    where: { projectId },
    include: {
      _count: { select: { tasks: true } },
      tasks: { select: { status: true } },
    },
    orderBy: { sortOrder: "asc" },
  });

  return milestones.map(toMilestoneResponse);
}

/**
 * Creates a new milestone within a project.
 */
export async function createMilestone(
  tenantId: string,
  projectId: string,
  input: CreateMilestoneInput,
): Promise<MilestoneResponse> {
  await requireProjectAccess(tenantId, projectId);

  // Auto-assign sortOrder if not specified
  const maxOrder = await prisma.milestone.aggregate({
    where: { projectId },
    _max: { sortOrder: true },
  });
  const sortOrder = input.sortOrder ?? (maxOrder._max.sortOrder ?? -1) + 1;

  const milestone = await prisma.milestone.create({
    data: {
      projectId,
      title: input.title,
      description: input.description ?? null,
      dueDate: input.dueDate ?? null,
      sortOrder,
    },
    include: {
      _count: { select: { tasks: true } },
      tasks: { select: { status: true } },
    },
  });

  return toMilestoneResponse(milestone);
}

/**
 * Updates a milestone's details.
 */
export async function updateMilestone(
  tenantId: string,
  milestoneId: string,
  input: UpdateMilestoneInput,
): Promise<MilestoneResponse> {
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: { project: { select: { tenantId: true } } },
  });

  if (!milestone || milestone.project.tenantId !== tenantId) {
    throw new NotFoundError("Milestone", milestoneId);
  }

  const updated = await prisma.milestone.update({
    where: { id: milestoneId },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.dueDate !== undefined && { dueDate: input.dueDate }),
      ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
      ...(input.isCompleted !== undefined && { isCompleted: input.isCompleted }),
    },
    include: {
      _count: { select: { tasks: true } },
      tasks: { select: { status: true } },
    },
  });

  return toMilestoneResponse(updated);
}

/**
 * Deletes a milestone. Tasks linked to it become unassigned (SetNull).
 */
export async function deleteMilestone(tenantId: string, milestoneId: string): Promise<void> {
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: { project: { select: { tenantId: true } } },
  });

  if (!milestone || milestone.project.tenantId !== tenantId) {
    throw new NotFoundError("Milestone", milestoneId);
  }

  await prisma.milestone.delete({ where: { id: milestoneId } });
}

/**
 * Reorders milestones by updating sortOrder for each provided id.
 */
export async function reorderMilestones(
  tenantId: string,
  projectId: string,
  input: ReorderMilestonesInput,
): Promise<void> {
  await requireProjectAccess(tenantId, projectId);

  await prisma.$transaction(
    input.orderedIds.map((id, index) =>
      prisma.milestone.update({
        where: { id },
        data: { sortOrder: index },
      }),
    ),
  );
}
