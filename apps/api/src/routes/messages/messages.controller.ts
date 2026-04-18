import type { Request, Response, NextFunction } from "express";
import { createMessageSchema, paginationSchema } from "@portalpro/types";
import {
  listMessages,
  getThread,
  sendMessage,
  markAllProjectMessagesRead,
  markMessageRead,
  deleteMessage,
} from "./messages.service";

/** GET /api/v1/projects/:projectId/messages */
export async function getMessagesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit } = paginationSchema.parse(req.query);
    const result = await listMessages(
      req.tenantId!,
      req.params["projectId"] as string,
      page,
      limit,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
}

/** POST /api/v1/projects/:projectId/messages */
export async function postMessageHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createMessageSchema.parse(req.body);
    const message = await sendMessage(
      req.tenantId!,
      req.params["projectId"] as string,
      req.user!.id,
      input,
    );
    res.status(201).json({ data: message });
  } catch (err) {
    next(err);
  }
}

/** GET /api/v1/messages/:messageId/thread */
export async function getThreadHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const thread = await getThread(req.tenantId!, req.params["messageId"] as string);
    res.json({ data: thread });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/v1/projects/:projectId/messages/mark-read */
export async function patchAllMessagesReadHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const count = await markAllProjectMessagesRead(
      req.tenantId!,
      req.params["projectId"] as string,
      req.user!.id,
    );
    res.json({ data: { count } });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/v1/messages/:messageId/read */
export async function patchMessageReadHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await markMessageRead(req.tenantId!, req.params["messageId"] as string);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/v1/messages/:messageId */
export async function deleteMessageHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await deleteMessage(
      req.tenantId!,
      req.params["messageId"] as string,
      req.user!.id,
      req.user!.role ?? "VIEWER",
    );
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
