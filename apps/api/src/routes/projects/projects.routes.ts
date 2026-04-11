import { Router } from "express";
import { requireRole } from "../../middleware/auth.middleware";
import {
  getProjects,
  getProjectById,
  postProject,
  patchProject,
  deleteProject,
} from "./projects.controller";

const router = Router();

router.get("/", getProjects);
router.post("/", requireRole("EDITOR"), postProject);
router.get("/:projectId", getProjectById);
router.patch("/:projectId", requireRole("EDITOR"), patchProject);
router.delete("/:projectId", requireRole("ADMIN"), deleteProject);

export { router as projectRoutes };
