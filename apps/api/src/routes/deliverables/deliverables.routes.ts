import { Router } from "express";
import { requireRole } from "../../middleware/auth.middleware";
import {
  getDeliverables,
  postDeliverable,
  getDeliverableById,
  patchDeliverable,
  deleteDeliverableHandler,
  postSubmitDeliverable,
  postApproveDeliverable,
  postRequestRevision,
  postFinaliseDeliverable,
  getDeliverableRevisions,
} from "./deliverables.controller";

const router = Router();

// Project-scoped deliverable routes (mounted under /projects/:projectId/deliverables)
export const projectDeliverableRouter = Router({ mergeParams: true });
projectDeliverableRouter.get("/", getDeliverables);
projectDeliverableRouter.post("/", requireRole("EDITOR"), postDeliverable);

// Standalone deliverable routes (mounted under /deliverables)
router.get("/:id", getDeliverableById);
router.patch("/:id", requireRole("EDITOR"), patchDeliverable);
router.delete("/:id", requireRole("ADMIN"), deleteDeliverableHandler);
router.post("/:id/submit", requireRole("EDITOR"), postSubmitDeliverable);
router.post("/:id/approve", postApproveDeliverable);
router.post("/:id/revise", postRequestRevision);
router.post("/:id/finalise", requireRole("EDITOR"), postFinaliseDeliverable);
router.get("/:id/revisions", getDeliverableRevisions);

export default router;
