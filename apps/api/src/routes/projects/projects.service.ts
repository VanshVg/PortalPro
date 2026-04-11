import { prisma } from "@portalpro/database";
import { NotFoundError, ForbiddenError } from "@portalpro/types";
import type {
  CreateProjectInput,
  UpdateProjectInput,
  ProjectResponse,
  ProjectSummary,
} from "@portalpro/types";

/**
 * Serializes a Project record into a ProjectResponse DTO.
 */
function toProjectResponse(project: {
  id: string;
  name: string;
  description: string | null;
  status: string;
  startDate: Date | null;
  endDate: Date | null;
  clientPortalId: string;
  createdAt: Date;
  updatedAt: Date;
  _count?: { tasks: number };
}): ProjectResponse {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status as ProjectResponse["status"],
    startDate: project.startDate?.toISOString() ?? null,
    endDate: project.endDate?.toISOString() ?? null,
    clientPortalId: project.clientPortalId,
    taskCount: project._count?.tasks,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}

/**
 * Lists all projects for a tenant, with task counts and progress.
 * Optionally filtered by portal ID.
 */
export async function listProjects(
  tenantId: string,
  portalId?: string,
): Promise<ProjectSummary[]> {
  const projects = await prisma.project.findMany({
    where: {
      tenantId,
      ...(portalId && { clientPortalId: portalId }),
    },
    include: {
      _count: { select: { tasks: true } },
      tasks: {
        select: { status: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return projects.map((p) => {
    const total = p._count.tasks;
    const done = p.tasks.filter((t) => t.status === "DONE").length;
    const progress = total === 0 ? 0 : Math.round((done / total) * 100);

    return {
      id: p.id,
      name: p.name,
      status: p.status as ProjectSummary["status"],
      progress,
      lastUpdated: p.updatedAt.toISOString(),
    };
  });
}

/**
 * Retrieves a single project with its milestones, task counts, etc.
 */
export async function getProject(tenantId: string, projectId: string): Promise<ProjectResponse> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      _count: { select: { tasks: true } },
      tasks: { select: { status: true } },
      milestones: {
        include: { _count: { select: { tasks: true } } },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!project || project.tenantId !== tenantId) {
    throw new NotFoundError("Project", projectId);
  }

  const completedTaskCount = project.tasks.filter((t) => t.status === "DONE").length;

  return {
    ...toProjectResponse({ ...project }),
    taskCount: project._count.tasks,
    completedTaskCount,
    milestones: project.milestones.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      dueDate: m.dueDate?.toISOString() ?? null,
      sortOrder: m.sortOrder,
      isCompleted: m.isCompleted,
      taskCount: m._count.tasks,
    })),
  };
}

/**
 * Creates a new project and links it to a client portal.
 * Validates that the portal belongs to the same tenant.
 */
export async function createProject(
  tenantId: string,
  input: CreateProjectInput,
): Promise<ProjectResponse> {
  // Verify the portal belongs to this tenant
  const portal = await prisma.clientPortal.findUnique({
    where: { id: input.clientPortalId },
    select: { tenantId: true },
  });

  if (!portal || portal.tenantId !== tenantId) {
    throw new NotFoundError("ClientPortal", input.clientPortalId);
  }

  const project = await prisma.project.create({
    data: {
      tenantId,
      clientPortalId: input.clientPortalId,
      name: input.name,
      description: input.description ?? null,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
    },
    include: { _count: { select: { tasks: true } } },
  });

  return toProjectResponse(project);
}

/**
 * Updates an existing project's metadata or status.
 */
export async function updateProject(
  tenantId: string,
  projectId: string,
  input: UpdateProjectInput,
): Promise<ProjectResponse> {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.tenantId !== tenantId) {
    throw new NotFoundError("Project", projectId);
  }

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.status !== undefined && { status: input.status }),
      ...(input.startDate !== undefined && { startDate: input.startDate }),
      ...(input.endDate !== undefined && { endDate: input.endDate }),
    },
    include: { _count: { select: { tasks: true } } },
  });

  return toProjectResponse(updated);
}

/**
 * Archives a project (soft delete via status change).
 * Only OWNER/ADMIN can archive.
 */
export async function archiveProject(
  tenantId: string,
  projectId: string,
  userId: string,
): Promise<void> {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.tenantId !== tenantId) {
    throw new NotFoundError("Project", projectId);
  }

  const membership = await prisma.tenantMember.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
  });
  if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
    throw new ForbiddenError("Only OWNER or ADMIN can archive projects");
  }

  await prisma.project.update({
    where: { id: projectId },
    data: { status: "ARCHIVED" },
  });
}
