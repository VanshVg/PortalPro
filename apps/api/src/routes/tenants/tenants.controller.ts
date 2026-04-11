import type { Request, Response, NextFunction } from "express";
import { updateTenantSchema } from "@portalpro/types";
import { getTenant, updateTenant, updateTenantLogo } from "./tenants.service";
import { generatePresignedPutUrl } from "../../lib/r2";
import { logger } from "../../lib/logger";

/**
 * GET /api/v1/tenants/current
 * Returns the current tenant's details.
 */
export async function getCurrentTenant(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tenant = await getTenant(req.tenantId!, req.user!.id);
    res.json({ data: tenant });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/tenants/current
 * Updates workspace name, branding colors, or custom domain.
 */
export async function patchCurrentTenant(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = updateTenantSchema.parse(req.body);
    const tenant = await updateTenant(req.tenantId!, req.user!.id, input);
    logger.info({ tenantId: req.tenantId }, "Tenant settings updated");
    res.json({ data: tenant });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/tenants/current/logo-presign
 * Returns a presigned PUT URL for uploading the workspace logo directly to R2.
 * Query params: fileName, mimeType, fileSize
 */
export async function getLogoPresignedUrl(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { fileName, mimeType, fileSize } = req.query as Record<string, string>;
    if (!fileName || !mimeType || !fileSize) {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "fileName, mimeType and fileSize are required" } });
      return;
    }
    const key = `tenants/${req.tenantId}/logo/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const uploadUrl = await generatePresignedPutUrl(key, mimeType, Number(fileSize));
    res.json({ data: { uploadUrl, key } });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/tenants/current/logo
 * Saves the R2 key as the tenant logo. Pass { logoUrl: null } to remove it.
 */
export async function patchTenantLogo(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { logoUrl } = req.body as { logoUrl: string | null };
    if (logoUrl !== null && typeof logoUrl !== "string") {
      res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "logoUrl must be a string or null" } });
      return;
    }
    const tenant = await updateTenantLogo(req.tenantId!, req.user!.id, logoUrl ?? null);
    logger.info({ tenantId: req.tenantId }, "Tenant logo updated");
    res.json({ data: tenant });
  } catch (err) {
    next(err);
  }
}
