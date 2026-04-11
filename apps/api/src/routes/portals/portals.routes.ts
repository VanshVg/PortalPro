import { Router } from "express";
import { requireRole } from "../../middleware/auth.middleware";
import {
  getPortals,
  getPortalById,
  postPortal,
  patchPortal,
  postInviteClient,
} from "./portals.controller";

const router = Router();

router.get("/", getPortals);
router.post("/", requireRole("EDITOR"), postPortal);
router.get("/:portalId", getPortalById);
router.patch("/:portalId", requireRole("EDITOR"), patchPortal);
router.post("/:portalId/invite", requireRole("EDITOR"), postInviteClient);

export { router as portalRoutes };
