import type { Request, Response, NextFunction } from "express";
import {
  createTaskSchema,
  updateTaskSchema,
  reorderTasksSchema,
  createCommentSchema,
} from "@portalpro/types";
import {
  listTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  reorderTasks,
  listComments,
  createComment,
  deleteComment,
} from "./tasks.service";

/** GET /api/v1/projects/:projectId/tasks */
export async function getTasksHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, assigneeId, milestoneId } = req.query as Record<string, string | undefined>;
    const tasks = await listTasks(req.tenantId!, req.params["projectId"] as string, {
      status,
      assigneeId,
      milestoneId,
    });
    res.json({ data: tasks });
  } catch (err) {
    next(err);
  }
}

/** POST /api/v1/projects/:projectId/tasks */
export async function postTaskHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createTaskSchema.parse(req.body);
    const task = await createTask(req.tenantId!, req.params["projectId"] as string, input);
    res.status(201).json({ data: task });
  } catch (err) {
    next(err);
  }
}

/** GET /api/v1/tasks/:taskId */
export async function getTaskHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const task = await getTask(req.tenantId!, req.params["taskId"] as string);
    res.json({ data: task });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/v1/tasks/:taskId */
export async function patchTaskHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateTaskSchema.parse(req.body);
    const task = await updateTask(req.tenantId!, req.params["taskId"] as string, input);
    res.json({ data: task });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/v1/tasks/:taskId */
export async function deleteTaskHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await deleteTask(req.tenantId!, req.params["taskId"] as string);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/v1/projects/:projectId/tasks/reorder */
export async function patchReorderTasksHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = reorderTasksSchema.parse(req.body);
    await reorderTasks(req.tenantId!, req.params["projectId"] as string, input.orderedIds);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/** GET /api/v1/tasks/:taskId/comments */
export async function getCommentsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const comments = await listComments(req.tenantId!, req.params["taskId"] as string);
    res.json({ data: comments });
  } catch (err) {
    next(err);
  }
}

/** POST /api/v1/tasks/:taskId/comments */
export async function postCommentHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createCommentSchema.parse(req.body);
    const comment = await createComment(
      req.tenantId!,
      req.params["taskId"] as string,
      req.user!.id,
      input,
    );
    res.status(201).json({ data: comment });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/v1/comments/:commentId */
export async function deleteCommentHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await deleteComment(
      req.tenantId!,
      req.params["commentId"] as string,
      req.user!.id,
      req.user!.role ?? "VIEWER",
    );
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
