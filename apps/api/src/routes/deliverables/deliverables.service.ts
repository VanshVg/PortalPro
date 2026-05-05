import { prisma } from "@portalpro/database";
import { NotFoundError, ForbiddenError } from "@portalpro/types";
import type {
  DeliverableResponse,
  CreateDeliverableInput,
  UpdateDeliverableInput,
  RequestRevisionInput,
} from "@portalpro/types";
import { sendDeliverableSubmittedEmail, sendDeliverableReviewedEmail } from "@portalpro/email/server";
import { logger } from "../../lib/logger";

/**
 * Serialises a Deliverable DB record to the API response DTO.
 */
function toDeliverableResponse(d: {
  id: string;
  title: string;
  description: string | null;
  status: string;
  fileIds: string[];
  submittedAt: Date | null;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  feedback: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}): DeliverableResponse {
  return {
    id: d.id,
    title: d.title,
    description: d.description,
    status: d.status as DeliverableResponse["status"],
    fileIds: d.fileIds,
    submittedAt: d.submittedAt?.toISOString() ?? null,
    reviewedAt: d.reviewedAt?.toISOString() ?? null,
    reviewedBy: d.reviewedBy,
    feedback: d.feedback,
    sortOrder: d.sortOrder,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

/**
 * Verifies the project belongs to the tenant.
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
 * Fetches a deliverable and verifies tenant ownership.
 * Returns the raw record with projectId for further checks.
 */
async function requireDeliverableAccess(tenantId: string, deliverableId: string) {
  const deliverable = await prisma.deliverable.findUnique({
    where: { id: deliverableId },
    include: { project: { select: { tenantId: true, id: true } } },
  });
  if (!deliverable || deliverable.project.tenantId !== tenantId) {
    throw new NotFoundError("Deliverable", deliverableId);
  }
  return deliverable;
}

/**
 * Lists all deliverables for a project, ordered by sortOrder.
 */
export async function listDeliverables(
  tenantId: string,
  projectId: string,
): Promise<DeliverableResponse[]> {
  await requireProjectAccess(tenantId, projectId);

  const deliverables = await prisma.deliverable.findMany({
    where: { projectId },
    orderBy: { sortOrder: "asc" },
  });

  return deliverables.map(toDeliverableResponse);
}

/**
 * Gets a single deliverable by id.
 */
export async function getDeliverable(
  tenantId: string,
  deliverableId: string,
): Promise<DeliverableResponse> {
  const deliverable = await requireDeliverableAccess(tenantId, deliverableId);
  return toDeliverableResponse(deliverable);
}

/**
 * Creates a new deliverable in DRAFT status.
 */
export async function createDeliverable(
  tenantId: string,
  projectId: string,
  input: CreateDeliverableInput,
): Promise<DeliverableResponse> {
  await requireProjectAccess(tenantId, projectId);

  const maxOrder = await prisma.deliverable.aggregate({
    where: { projectId },
    _max: { sortOrder: true },
  });
  const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  const deliverable = await prisma.deliverable.create({
    data: {
      projectId,
      title: input.title,
      description: input.description ?? null,
      fileIds: input.fileIds,
      sortOrder,
    },
  });

  return toDeliverableResponse(deliverable);
}

/**
 * Updates a deliverable's title, description, or fileIds.
 * Only allowed in DRAFT status.
 */
export async function updateDeliverable(
  tenantId: string,
  deliverableId: string,
  input: UpdateDeliverableInput,
): Promise<DeliverableResponse> {
  const existing = await requireDeliverableAccess(tenantId, deliverableId);

  if (existing.status !== "DRAFT") {
    throw new ForbiddenError("Only DRAFT deliverables can be edited");
  }

  const updated = await prisma.deliverable.update({
    where: { id: deliverableId },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.fileIds !== undefined && { fileIds: input.fileIds }),
    },
  });

  return toDeliverableResponse(updated);
}

/**
 * Deletes a deliverable. Only allowed in DRAFT status.
 */
export async function deleteDeliverable(
  tenantId: string,
  deliverableId: string,
): Promise<void> {
  const existing = await requireDeliverableAccess(tenantId, deliverableId);

  if (!["DRAFT", "REVISION_REQUESTED"].includes(existing.status)) {
    throw new ForbiddenError("Cannot delete a submitted or approved deliverable");
  }

  await prisma.deliverable.delete({ where: { id: deliverableId } });
}

/**
 * Submits a deliverable for client review (DRAFT | REVISION_REQUESTED → SUBMITTED).
 * Triggers email notification to the client.
 */
export async function submitDeliverable(
  tenantId: string,
  deliverableId: string,
  actorId: string,
): Promise<DeliverableResponse> {
  const existing = await requireDeliverableAccess(tenantId, deliverableId);

  if (!["DRAFT", "REVISION_REQUESTED"].includes(existing.status)) {
    throw new ForbiddenError("Only DRAFT or REVISION_REQUESTED deliverables can be submitted");
  }

  const [updated] = await prisma.$transaction([
    prisma.deliverable.update({
      where: { id: deliverableId },
      data: { status: "SUBMITTED", submittedAt: new Date(), feedback: null },
    }),
    prisma.deliverableRevision.create({
      data: {
        deliverableId,
        fromStatus: existing.status,
        toStatus: "SUBMITTED",
        actorId,
      },
    }),
  ]);

  // Fire-and-forget email notification
  void sendDeliverableSubmittedEmail({
    deliverableTitle: existing.title,
  }).catch((err: unknown) => {
    logger.warn({ err, deliverableId }, "Failed to send deliverable submitted email");
  });

  return toDeliverableResponse(updated);
}

/**
 * Approves a submitted deliverable (SUBMITTED → APPROVED).
 */
export async function approveDeliverable(
  tenantId: string,
  deliverableId: string,
  actorId: string,
): Promise<DeliverableResponse> {
  const existing = await requireDeliverableAccess(tenantId, deliverableId);

  if (existing.status !== "SUBMITTED") {
    throw new ForbiddenError("Only SUBMITTED deliverables can be approved");
  }

  const [updated] = await prisma.$transaction([
    prisma.deliverable.update({
      where: { id: deliverableId },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewedBy: actorId,
      },
    }),
    prisma.deliverableRevision.create({
      data: {
        deliverableId,
        fromStatus: "SUBMITTED",
        toStatus: "APPROVED",
        actorId,
      },
    }),
  ]);

  void sendDeliverableReviewedEmail({
    deliverableTitle: existing.title,
    decision: "approved",
  }).catch((err: unknown) => {
    logger.warn({ err, deliverableId }, "Failed to send deliverable approved email");
  });

  return toDeliverableResponse(updated);
}

/**
 * Requests a revision on a submitted deliverable (SUBMITTED → REVISION_REQUESTED).
 */
export async function requestRevision(
  tenantId: string,
  deliverableId: string,
  actorId: string,
  input: RequestRevisionInput,
): Promise<DeliverableResponse> {
  const existing = await requireDeliverableAccess(tenantId, deliverableId);

  if (existing.status !== "SUBMITTED") {
    throw new ForbiddenError("Only SUBMITTED deliverables can have a revision requested");
  }

  const [updated] = await prisma.$transaction([
    prisma.deliverable.update({
      where: { id: deliverableId },
      data: {
        status: "REVISION_REQUESTED",
        reviewedAt: new Date(),
        reviewedBy: actorId,
        feedback: input.feedback,
      },
    }),
    prisma.deliverableRevision.create({
      data: {
        deliverableId,
        fromStatus: "SUBMITTED",
        toStatus: "REVISION_REQUESTED",
        actorId,
        feedback: input.feedback,
      },
    }),
  ]);

  void sendDeliverableReviewedEmail({
    deliverableTitle: existing.title,
    decision: "revision_requested",
    feedback: input.feedback,
  }).catch((err: unknown) => {
    logger.warn({ err, deliverableId }, "Failed to send revision requested email");
  });

  return toDeliverableResponse(updated);
}

/**
 * Marks an approved deliverable as FINAL.
 */
export async function finaliseDeliverable(
  tenantId: string,
  deliverableId: string,
  actorId: string,
): Promise<DeliverableResponse> {
  const existing = await requireDeliverableAccess(tenantId, deliverableId);

  if (existing.status !== "APPROVED") {
    throw new ForbiddenError("Only APPROVED deliverables can be marked as final");
  }

  const [updated] = await prisma.$transaction([
    prisma.deliverable.update({
      where: { id: deliverableId },
      data: { status: "FINAL" },
    }),
    prisma.deliverableRevision.create({
      data: {
        deliverableId,
        fromStatus: "APPROVED",
        toStatus: "FINAL",
        actorId,
      },
    }),
  ]);

  return toDeliverableResponse(updated);
}

/**
 * Returns the full revision history for a deliverable.
 */
export async function listRevisions(
  tenantId: string,
  deliverableId: string,
): Promise<Array<{
  id: string;
  fromStatus: string;
  toStatus: string;
  feedback: string | null;
  actorId: string | null;
  createdAt: string;
}>> {
  await requireDeliverableAccess(tenantId, deliverableId);

  const revisions = await prisma.deliverableRevision.findMany({
    where: { deliverableId },
    orderBy: { createdAt: "asc" },
  });

  return revisions.map((r) => ({
    id: r.id,
    fromStatus: r.fromStatus,
    toStatus: r.toStatus,
    feedback: r.feedback,
    actorId: r.actorId,
    createdAt: r.createdAt.toISOString(),
  }));
}
