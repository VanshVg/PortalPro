import { Router } from "express";
import { requireRole } from "../../middleware/auth.middleware";
import {
  getTasksHandler,
  postTaskHandler,
  getTaskHandler,
  patchTaskHandler,
  deleteTaskHandler,
  patchReorderTasksHandler,
  getCommentsHandler,
  postCommentHandler,
  deleteCommentHandler,
} from "./tasks.controller";

/** Project-scoped task routes — mounted under /projects/:projectId/tasks */
export const projectTaskRouter = Router({ mergeParams: true });
projectTaskRouter.get("/", getTasksHandler);
projectTaskRouter.post("/", requireRole("EDITOR"), postTaskHandler);
projectTaskRouter.patch("/reorder", requireRole("EDITOR"), patchReorderTasksHandler);

/** Standalone task routes — mounted under /tasks */
const taskRouter = Router();
taskRouter.get("/:taskId", getTaskHandler);
taskRouter.patch("/:taskId", requireRole("EDITOR"), patchTaskHandler);
taskRouter.delete("/:taskId", requireRole("ADMIN"), deleteTaskHandler);
taskRouter.get("/:taskId/comments", getCommentsHandler);
taskRouter.post("/:taskId/comments", postCommentHandler);

/** Standalone comment routes — mounted under /comments */
export const commentRouter = Router();
commentRouter.delete("/:commentId", deleteCommentHandler);

export default taskRouter;
