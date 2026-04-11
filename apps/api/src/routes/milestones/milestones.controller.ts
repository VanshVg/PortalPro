import type { Request, Response, NextFunction } from "express";
import {
  createMilestoneSchema,
  updateMilestoneSchema,
  reorderMilestonesSchema,
} from "@portalpro/types";
import {
  listMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  reorderMilestones,
} from "./milestones.service";

/** GET /api/v1/projects/:projectId/milestones */
export async function getMilestones(req: Request, res: Response, next: NextFunction) {
  try {
    const milestones = await listMilestones(
      req.tenantId!,
      req.params["projectId"] as string,
    );
    res.json({ data: milestones });
  } catch (err) {
    next(err);
  }
}

/** POST /api/v1/projects/:projectId/milestones */
export async function postMilestone(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createMilestoneSchema.parse(req.body);
    const milestone = await createMilestone(
      req.tenantId!,
      req.params["projectId"] as string,
      input,
    );
    res.status(201).json({ data: milestone });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/v1/milestones/:id */
export async function patchMilestone(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateMilestoneSchema.parse(req.body);
    const milestone = await updateMilestone(
      req.tenantId!,
      req.params["id"] as string,
      input,
    );
    res.json({ data: milestone });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/v1/milestones/:id */
export async function deleteMilestoneHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await deleteMilestone(req.tenantId!, req.params["id"] as string);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/v1/projects/:projectId/milestones/reorder */
export async function patchReorderMilestones(req: Request, res: Response, next: NextFunction) {
  try {
    const input = reorderMilestonesSchema.parse(req.body);
    await reorderMilestones(
      req.tenantId!,
      req.params["projectId"] as string,
      input,
    );
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
