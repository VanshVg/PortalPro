import { Router } from "express";
import { requireRole } from "../../middleware/auth.middleware";
import {
  getProjects,
  getProjectById,
  postProject,
  patchProject,
  deleteProject,
} from "./projects.controller";
import { projectMilestoneRouter } from "../milestones/milestones.routes";
import { projectTaskRouter } from "../tasks/tasks.routes";
import { projectMessageRouter } from "../messages/messages.routes";
import { projectTimeEntryRouter } from "../time-entries/time-entries.routes";

const router = Router();

router.get("/", getProjects);
router.post("/", requireRole("EDITOR"), postProject);
router.get("/:projectId", getProjectById);
router.patch("/:projectId", requireRole("EDITOR"), patchProject);
router.delete("/:projectId", requireRole("ADMIN"), deleteProject);

// Nested sub-resources (Phase 3)
router.use("/:projectId/milestones", projectMilestoneRouter);
router.use("/:projectId/tasks", projectTaskRouter);
router.use("/:projectId/messages", projectMessageRouter);
router.use("/:projectId/time-entries", projectTimeEntryRouter);

export { router as projectRoutes };
