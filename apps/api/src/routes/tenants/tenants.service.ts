import { prisma } from "@portalpro/database";
import { NotFoundError, ForbiddenError } from "@portalpro/types";
import type { UpdateTenantInput, TenantResponse } from "@portalpro/types";

/**
 * Serializes a Prisma Tenant record into a TenantResponse DTO.
 */
function toTenantResponse(tenant: {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  primaryColor: string;
  secondaryColor: string;
  customDomain: string | null;
  plan: string;
  createdAt: Date;
}): TenantResponse {
  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    logo: tenant.logo,
    primaryColor: tenant.primaryColor,
    secondaryColor: tenant.secondaryColor,
    customDomain: tenant.customDomain,
    plan: tenant.plan as TenantResponse["plan"],
    createdAt: tenant.createdAt.toISOString(),
  };
}

/**
 * Retrieves the current tenant by ID.
 * Verifies the requesting user is a member of the tenant.
 */
export async function getTenant(tenantId: string, userId: string): Promise<TenantResponse> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) throw new NotFoundError("Tenant", tenantId);

  const membership = await prisma.tenantMember.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
  });
  if (!membership) throw new ForbiddenError("You are not a member of this workspace");

  return toTenantResponse(tenant);
}

/**
 * Updates workspace settings (name, branding colors, custom domain).
 * Only OWNER or ADMIN may update tenant settings.
 */
export async function updateTenant(
  tenantId: string,
  userId: string,
  input: UpdateTenantInput,
): Promise<TenantResponse> {
  const membership = await prisma.tenantMember.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
  });

  if (!membership) throw new ForbiddenError("You are not a member of this workspace");
  if (!["OWNER", "ADMIN"].includes(membership.role)) {
    throw new ForbiddenError("Only OWNER or ADMIN can update workspace settings");
  }

  const tenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.primaryColor !== undefined && { primaryColor: input.primaryColor }),
      ...(input.secondaryColor !== undefined && { secondaryColor: input.secondaryColor }),
      ...(input.customDomain !== undefined && { customDomain: input.customDomain }),
    },
  });

  return toTenantResponse(tenant);
}

/**
 * Updates the tenant logo URL (set after R2 upload confirmation).
 * Pass null to remove the logo.
 */
export async function updateTenantLogo(
  tenantId: string,
  userId: string,
  logoUrl: string | null,
): Promise<TenantResponse> {
  const membership = await prisma.tenantMember.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
  });

  if (!membership) throw new ForbiddenError("You are not a member of this workspace");
  if (!["OWNER", "ADMIN"].includes(membership.role)) {
    throw new ForbiddenError("Only OWNER or ADMIN can update the workspace logo");
  }

  const tenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: { logo: logoUrl },
  });

  return toTenantResponse(tenant);
}
