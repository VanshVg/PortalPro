import type { Request, Response, NextFunction } from "express";
import {
  createDeliverableSchema,
  updateDeliverableSchema,
  requestRevisionSchema,
} from "@portalpro/types";
import {
  listDeliverables,
  getDeliverable,
  createDeliverable,
  updateDeliverable,
  deleteDeliverable,
  submitDeliverable,
  approveDeliverable,
  requestRevision,
  finaliseDeliverable,
  listRevisions,
} from "./deliverables.service";

/** GET /api/v1/projects/:projectId/deliverables */
export async function getDeliverables(req: Request, res: Response, next: NextFunction) {
  try {
    const deliverables = await listDeliverables(
      req.tenantId!,
      req.params["projectId"] as string,
    );
    res.json({ data: deliverables });
  } catch (err) {
    next(err);
  }
}

/** POST /api/v1/projects/:projectId/deliverables */
export async function postDeliverable(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createDeliverableSchema.parse(req.body);
    const deliverable = await createDeliverable(
      req.tenantId!,
      req.params["projectId"] as string,
      input,
    );
    res.status(201).json({ data: deliverable });
  } catch (err) {
    next(err);
  }
}

/** GET /api/v1/deliverables/:id */
export async function getDeliverableById(req: Request, res: Response, next: NextFunction) {
  try {
    const deliverable = await getDeliverable(req.tenantId!, req.params["id"] as string);
    res.json({ data: deliverable });
  } catch (err) {
    next(err);
  }
}

/** PATCH /api/v1/deliverables/:id */
export async function patchDeliverable(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateDeliverableSchema.parse(req.body);
    const deliverable = await updateDeliverable(
      req.tenantId!,
      req.params["id"] as string,
      input,
    );
    res.json({ data: deliverable });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/v1/deliverables/:id */
export async function deleteDeliverableHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await deleteDeliverable(req.tenantId!, req.params["id"] as string);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/** POST /api/v1/deliverables/:id/submit */
export async function postSubmitDeliverable(req: Request, res: Response, next: NextFunction) {
  try {
    const deliverable = await submitDeliverable(
      req.tenantId!,
      req.params["id"] as string,
      req.user?.id ?? "",
    );
    res.json({ data: deliverable });
  } catch (err) {
    next(err);
  }
}

/** POST /api/v1/deliverables/:id/approve */
export async function postApproveDeliverable(req: Request, res: Response, next: NextFunction) {
  try {
    const deliverable = await approveDeliverable(
      req.tenantId!,
      req.params["id"] as string,
      req.user?.id ?? "",
    );
    res.json({ data: deliverable });
  } catch (err) {
    next(err);
  }
}

/** POST /api/v1/deliverables/:id/revise */
export async function postRequestRevision(req: Request, res: Response, next: NextFunction) {
  try {
    const input = requestRevisionSchema.parse(req.body);
    const deliverable = await requestRevision(
      req.tenantId!,
      req.params["id"] as string,
      req.user?.id ?? "",
      input,
    );
    res.json({ data: deliverable });
  } catch (err) {
    next(err);
  }
}

/** POST /api/v1/deliverables/:id/finalise */
export async function postFinaliseDeliverable(req: Request, res: Response, next: NextFunction) {
  try {
    const deliverable = await finaliseDeliverable(
      req.tenantId!,
      req.params["id"] as string,
      req.user?.id ?? "",
    );
    res.json({ data: deliverable });
  } catch (err) {
    next(err);
  }
}

/** GET /api/v1/deliverables/:id/revisions */
export async function getDeliverableRevisions(req: Request, res: Response, next: NextFunction) {
  try {
    const revisions = await listRevisions(req.tenantId!, req.params["id"] as string);
    res.json({ data: revisions });
  } catch (err) {
    next(err);
  }
}
