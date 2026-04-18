import { Router } from "express";
import {
  getMessagesHandler,
  postMessageHandler,
  getThreadHandler,
  patchAllMessagesReadHandler,
  patchMessageReadHandler,
  deleteMessageHandler,
} from "./messages.controller";

/** Project-scoped message routes — mounted under /projects/:projectId/messages */
export const projectMessageRouter = Router({ mergeParams: true });
projectMessageRouter.get("/", getMessagesHandler);
projectMessageRouter.post("/", postMessageHandler);
projectMessageRouter.patch("/mark-read", patchAllMessagesReadHandler);

/** Standalone message routes — mounted under /messages */
const messageRouter = Router();
messageRouter.get("/:messageId/thread", getThreadHandler);
messageRouter.patch("/:messageId/read", patchMessageReadHandler);
messageRouter.delete("/:messageId", deleteMessageHandler);

export default messageRouter;
