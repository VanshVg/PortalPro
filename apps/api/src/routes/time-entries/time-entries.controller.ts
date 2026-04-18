import type { Request, Response, NextFunction } from "express";
import { createTimeEntrySchema, updateTimeEntrySchema } from "@portalpro/types";
import {
  listTimeEntries,
  getTimeEntry,
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  getTimeSummary,
} from "./time-entries.service";

/** GET /api/v1/projects/:projectId/time-entries */
export async function getTimeEntriesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { taskId, userId } = req.query as Record<string, string | undefined>;
    const entries = await listTimeEntries(
      req.tenantId!,
      req.params["projectId"] as string,
      { taskId, userId },
    );
    res.json({ data: entries });
  } catch (err) {
    next(err);
  }
}

/** POST /api/v1/time-entries */
export async function postTimeEntryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createTimeEntrySchema.parse(req.body);
    const entry = await createTimeEntry(req.tenantId!, req.user!.id, input);
    res.status(201).json({ data: entry });
  } catch (err) {
    next(err);
  }
}

/** GET /api/v1/time-entries/:entryId */
export async function getTimeEntryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const entry = await getTimeEntry(req.tenantId!, req.params["entryId"] as string);
    res.json({ data: entry });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/v1/time-entries/:entryId */
export async function patchTimeEntryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateTimeEntrySchema.parse(req.body);
    const entry = await updateTimeEntry(
      req.tenantId!,
      req.params["entryId"] as string,
      req.user!.id,
      req.user!.role ?? "VIEWER",
      input,
    );
    res.json({ data: entry });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/v1/time-entries/:entryId */
export async function deleteTimeEntryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await deleteTimeEntry(
      req.tenantId!,
      req.params["entryId"] as string,
      req.user!.id,
      req.user!.role ?? "VIEWER",
    );
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/** GET /api/v1/projects/:projectId/time-entries/summary */
export async function getTimeSummaryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { taskId } = req.query as { taskId?: string };
    const summary = await getTimeSummary(
      req.tenantId!,
      req.params["projectId"] as string,
      taskId,
    );
    res.json({ data: summary });
  } catch (err) {
    next(err);
  }
}
