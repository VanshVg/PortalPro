import type { Request, Response, NextFunction } from "express";
import { inviteMemberSchema, updateMemberRoleSchema } from "@portalpro/types";
import {
  listTenantMembers,
  inviteTenantMember,
  updateTenantMemberRole,
  removeTenantMember,
} from "./members.service";
import { logger } from "../../lib/logger";

/**
 * GET /api/v1/tenants/current/members
 */
export async function listMembers(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const members = await listTenantMembers(req.tenantId!);
    res.json({ data: members });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/tenants/current/members
 */
export async function inviteMember(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = inviteMemberSchema.parse(req.body);
    const member = await inviteTenantMember(req.tenantId!, req.user!.id, input);
    logger.info({ tenantId: req.tenantId, email: input.email }, "Team member invited");
    res.status(201).json({ data: member });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/tenants/current/members/:memberId
 */
export async function updateMemberRole(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const memberId = req.params["memberId"] as string;
    const input = updateMemberRoleSchema.parse(req.body);
    const member = await updateTenantMemberRole(req.tenantId!, req.user!.id, memberId, input);
    logger.info({ tenantId: req.tenantId, memberId }, "Member role updated");
    res.json({ data: member });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/tenants/current/members/:memberId
 */
export async function removeMember(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const memberId = req.params["memberId"] as string;
    await removeTenantMember(req.tenantId!, req.user!.id, memberId);
    logger.info({ tenantId: req.tenantId, memberId }, "Member removed");
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
