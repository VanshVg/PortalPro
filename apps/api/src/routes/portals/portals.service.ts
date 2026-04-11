import { prisma } from "@portalpro/database";
import { NotFoundError, ForbiddenError } from "@portalpro/types";
import type {
  CreatePortalInput,
  UpdatePortalInput,
  InviteClientInput,
  ClientPortalResponse,
  ClientPortalAccessResponse,
} from "@portalpro/types";
import { hash } from "bcryptjs";
import { randomBytes } from "crypto";
import { sendClientInviteEmail } from "@portalpro/email/server";
import { PORTAL_URL } from "../../lib/env";

/**
 * Serializes a ClientPortal record into a ClientPortalResponse DTO.
 */
function toPortalResponse(
  portal: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    primaryColor: string | null;
    customDomain: string | null;
    isActive: boolean;
  },
  extras?: { projectCount?: number; lastActivity?: string },
): ClientPortalResponse {
  return {
    id: portal.id,
    name: portal.name,
    slug: portal.slug,
    logo: portal.logo,
    primaryColor: portal.primaryColor,
    customDomain: portal.customDomain,
    isActive: portal.isActive,
    ...extras,
  };
}

/**
 * Lists all client portals for a tenant, with project counts.
 */
export async function listPortals(tenantId: string): Promise<ClientPortalResponse[]> {
  const portals = await prisma.clientPortal.findMany({
    where: { tenantId },
    include: {
      _count: { select: { projects: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return portals.map((p) =>
    toPortalResponse(p, { projectCount: p._count.projects }),
  );
}

/**
 * Retrieves a single portal by ID, validating tenant ownership.
 */
export async function getPortal(
  tenantId: string,
  portalId: string,
): Promise<ClientPortalResponse & { access: ClientPortalAccessResponse[] }> {
  const portal = await prisma.clientPortal.findUnique({
    where: { id: portalId },
    include: {
      _count: { select: { projects: true } },
      access: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              avatarUrl: true,
              locale: true,
              timezone: true,
            },
          },
        },
        orderBy: { invitedAt: "asc" },
      },
    },
  });

  if (!portal || portal.tenantId !== tenantId) {
    throw new NotFoundError("ClientPortal", portalId);
  }

  return {
    ...toPortalResponse(portal, { projectCount: portal._count.projects }),
    access: portal.access.map((a) => ({
      id: a.id,
      userId: a.userId,
      user: {
        id: a.user.id,
        email: a.user.email,
        name: a.user.name,
        avatarUrl: a.user.avatarUrl,
        locale: a.user.locale,
        timezone: a.user.timezone,
      },
      role: a.role,
      invitedAt: a.invitedAt.toISOString(),
      acceptedAt: a.acceptedAt?.toISOString() ?? null,
    })),
  };
}

/**
 * Creates a new client portal for a tenant.
 * Auto-generates a slug from the portal name if not provided.
 */
export async function createPortal(
  tenantId: string,
  input: CreatePortalInput,
): Promise<ClientPortalResponse> {
  const rawSlug =
    input.slug ??
    input.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  // Ensure slug is unique within this tenant
  const existing = await prisma.clientPortal.findUnique({
    where: { tenantId_slug: { tenantId, slug: rawSlug } },
  });
  const slug = existing ? `${rawSlug}-${Date.now()}` : rawSlug;

  const portal = await prisma.clientPortal.create({
    data: {
      tenantId,
      name: input.name,
      slug,
      primaryColor: input.primaryColor ?? null,
      customDomain: input.customDomain ?? null,
    },
  });

  return toPortalResponse(portal, { projectCount: 0 });
}

/**
 * Updates a portal's settings (name, branding, active state).
 */
export async function updatePortal(
  tenantId: string,
  portalId: string,
  input: UpdatePortalInput,
): Promise<ClientPortalResponse> {
  const portal = await prisma.clientPortal.findUnique({ where: { id: portalId } });
  if (!portal || portal.tenantId !== tenantId) {
    throw new NotFoundError("ClientPortal", portalId);
  }

  const updated = await prisma.clientPortal.update({
    where: { id: portalId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.primaryColor !== undefined && { primaryColor: input.primaryColor }),
      ...(input.customDomain !== undefined && { customDomain: input.customDomain }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
    include: { _count: { select: { projects: true } } },
  });

  return toPortalResponse(updated, { projectCount: updated._count.projects });
}

/**
 * Invites a client user to access a portal.
 *
 * Creates a user account if needed, then grants ClientPortalAccess.
 * Sends an invite email with a magic link.
 */
export async function inviteClientToPortal(
  tenantId: string,
  portalId: string,
  input: InviteClientInput,
): Promise<ClientPortalAccessResponse> {
  const portal = await prisma.clientPortal.findUnique({
    where: { id: portalId },
    select: { id: true, tenantId: true, name: true, slug: true },
  });
  if (!portal || portal.tenantId !== tenantId) {
    throw new NotFoundError("ClientPortal", portalId);
  }

  let user = await prisma.user.findUnique({ where: { email: input.email } });

  if (user) {
    const existing = await prisma.clientPortalAccess.findUnique({
      where: { clientPortalId_userId: { clientPortalId: portalId, userId: user.id } },
    });
    if (existing) {
      throw new ForbiddenError(`${input.email} already has access to this portal`);
    }
  } else {
    const tempPassword = randomBytes(16).toString("hex");
    const passwordHash = await hash(tempPassword, 12);
    user = await prisma.user.create({
      data: { email: input.email, name: input.name, passwordHash },
    });
  }

  const access = await prisma.clientPortalAccess.create({
    data: {
      clientPortalId: portalId,
      userId: user.id,
      role: input.role,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          locale: true,
          timezone: true,
        },
      },
    },
  });

  // Generate invite token
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.verificationToken.deleteMany({
    where: { identifier: `client-invite:${input.email}:${portalId}` },
  });
  await prisma.verificationToken.create({
    data: {
      identifier: `client-invite:${input.email}:${portalId}`,
      token,
      expires,
    },
  });

  const inviteUrl = `${PORTAL_URL}/accept-invite?token=${token}&email=${encodeURIComponent(input.email)}&portalId=${portalId}`;

  await sendClientInviteEmail({
    to: input.email,
    clientName: input.name,
    portalName: portal.name,
    inviteUrl,
  });

  return {
    id: access.id,
    userId: access.userId,
    user: {
      id: access.user.id,
      email: access.user.email,
      name: access.user.name,
      avatarUrl: access.user.avatarUrl,
      locale: access.user.locale,
      timezone: access.user.timezone,
    },
    role: access.role,
    invitedAt: access.invitedAt.toISOString(),
    acceptedAt: access.acceptedAt?.toISOString() ?? null,
  };
}
