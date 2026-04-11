import { Router } from "express";
import { requireRole } from "../../middleware/auth.middleware";
import {
  getMilestones,
  postMilestone,
  patchMilestone,
  deleteMilestoneHandler,
  patchReorderMilestones,
} from "./milestones.controller";

const router = Router();

// Project-scoped milestone routes (mounted under /projects/:projectId/milestones)
export const projectMilestoneRouter = Router({ mergeParams: true });
projectMilestoneRouter.get("/", getMilestones);
projectMilestoneRouter.post("/", requireRole("EDITOR"), postMilestone);
projectMilestoneRouter.patch("/reorder", requireRole("EDITOR"), patchReorderMilestones);

// Standalone milestone routes (mounted under /milestones)
router.patch("/:id", requireRole("EDITOR"), patchMilestone);
router.delete("/:id", requireRole("ADMIN"), deleteMilestoneHandler);

export default router;
