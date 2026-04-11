import type { Request, Response, NextFunction } from "express";
import { createPortalSchema, updatePortalSchema, inviteClientSchema } from "@portalpro/types";
import {
  listPortals,
  getPortal,
  createPortal,
  updatePortal,
  inviteClientToPortal,
} from "./portals.service";
import { logger } from "../../lib/logger";

/**
 * GET /api/v1/portals
 */
export async function getPortals(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const portals = await listPortals(req.tenantId!);
    res.json({ data: portals });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/portals/:portalId
 */
export async function getPortalById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const portal = await getPortal(req.tenantId!, req.params["portalId"] as string);
    res.json({ data: portal });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/portals
 */
export async function postPortal(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = createPortalSchema.parse(req.body);
    const portal = await createPortal(req.tenantId!, input);
    logger.info({ tenantId: req.tenantId, portalId: portal.id }, "Client portal created");
    res.status(201).json({ data: portal });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/portals/:portalId
 */
export async function patchPortal(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = updatePortalSchema.parse(req.body);
    const portalId = req.params["portalId"] as string;
    const portal = await updatePortal(req.tenantId!, portalId, input);
    logger.info({ tenantId: req.tenantId, portalId }, "Portal updated");
    res.json({ data: portal });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/portals/:portalId/invite
 */
export async function postInviteClient(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = inviteClientSchema.parse(req.body);
    const portalId = req.params["portalId"] as string;
    const access = await inviteClientToPortal(req.tenantId!, portalId, input);
    logger.info(
      { tenantId: req.tenantId, portalId, email: input.email },
      "Client invited to portal",
    );
    res.status(201).json({ data: access });
  } catch (err) {
    next(err);
  }
}
