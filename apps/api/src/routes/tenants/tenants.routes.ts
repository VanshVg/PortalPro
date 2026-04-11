import { Router } from "express";
import { requireRole } from "../../middleware/auth.middleware";
import {
  getCurrentTenant,
  patchCurrentTenant,
  patchTenantLogo,
  getLogoPresignedUrl,
} from "./tenants.controller";
import {
  listMembers,
  inviteMember,
  updateMemberRole,
  removeMember,
} from "./members.controller";

const router = Router();

// --- Tenant settings ---
router.get("/current", getCurrentTenant);
router.patch("/current", requireRole("ADMIN"), patchCurrentTenant);
router.get("/current/logo-presign", requireRole("ADMIN"), getLogoPresignedUrl);
router.patch("/current/logo", requireRole("ADMIN"), patchTenantLogo);

// --- Team members ---
router.get("/current/members", listMembers);
router.post("/current/members", requireRole("ADMIN"), inviteMember);
router.patch("/current/members/:memberId", requireRole("ADMIN"), updateMemberRole);
router.delete("/current/members/:memberId", requireRole("ADMIN"), removeMember);

export { router as tenantRoutes };
