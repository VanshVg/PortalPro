import { prisma } from "@portalpro/database";
import { NotFoundError, ForbiddenError } from "@portalpro/types";
import type {
  InviteMemberInput,
  UpdateMemberRoleInput,
  TenantMemberResponse,
} from "@portalpro/types";
import { hash } from "bcryptjs";
import { randomBytes } from "crypto";
import { sendTeamInviteEmail } from "@portalpro/email/server";
import { AGENCY_URL } from "../../lib/env";

/**
 * Serializes a TenantMember + User into a TenantMemberResponse DTO.
 */
function toMemberResponse(member: {
  id: string;
  role: string;
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    locale: string;
    timezone: string;
  };
}): TenantMemberResponse {
  return {
    id: member.id,
    role: member.role as TenantMemberResponse["role"],
    user: {
      id: member.user.id,
      email: member.user.email,
      name: member.user.name,
      avatarUrl: member.user.avatarUrl,
      locale: member.user.locale,
      timezone: member.user.timezone,
    },
  };
}

/**
 * Lists all members of a tenant workspace.
 */
export async function listTenantMembers(tenantId: string): Promise<TenantMemberResponse[]> {
  const members = await prisma.tenantMember.findMany({
    where: { tenantId },
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
    orderBy: { user: { name: "asc" } },
  });

  return members.map(toMemberResponse);
}

/**
 * Invites a new user to the tenant workspace.
 *
 * If the user already exists (by email), they are added directly.
 * If they don't exist, a new account is created with a temporary password,
 * and an invitation email is sent.
 */
export async function inviteTenantMember(
  tenantId: string,
  inviterId: string,
  input: InviteMemberInput,
): Promise<TenantMemberResponse> {
  // Verify the inviter is in this tenant
  const inviterMembership = await prisma.tenantMember.findUnique({
    where: { tenantId_userId: { tenantId, userId: inviterId } },
  });
  if (!inviterMembership) throw new ForbiddenError("You are not a member of this workspace");

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true },
  });
  if (!tenant) throw new NotFoundError("Tenant", tenantId);

  let user = await prisma.user.findUnique({ where: { email: input.email } });

  if (user) {
    // User exists — check they're not already a member
    const existing = await prisma.tenantMember.findUnique({
      where: { tenantId_userId: { tenantId, userId: user.id } },
    });
    if (existing) {
      throw new ForbiddenError(`${input.email} is already a member of this workspace`);
    }
  } else {
    // New user — create with temporary password hash
    const tempPassword = randomBytes(16).toString("hex");
    const passwordHash = await hash(tempPassword, 12);
    user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash,
        // Email is not verified until they follow the invite link
      },
    });
  }

  // Create the tenant membership
  const member = await prisma.tenantMember.create({
    data: { tenantId, userId: user.id, role: input.role },
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

  // Generate invitation token and send email
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.verificationToken.deleteMany({
    where: { identifier: `team-invite:${input.email}` },
  });
  await prisma.verificationToken.create({
    data: { identifier: `team-invite:${input.email}`, token, expires },
  });

  const inviteUrl = `${AGENCY_URL}/accept-invite?token=${token}&email=${encodeURIComponent(input.email)}`;

  await sendTeamInviteEmail({
    to: input.email,
    inviteeName: input.name,
    workspaceName: tenant.name,
    inviteUrl,
  });

  return toMemberResponse(member);
}

/**
 * Updates a team member's role. Cannot change the last OWNER.
 */
export async function updateTenantMemberRole(
  tenantId: string,
  requesterId: string,
  memberId: string,
  input: UpdateMemberRoleInput,
): Promise<TenantMemberResponse> {
  const requesterMembership = await prisma.tenantMember.findUnique({
    where: { tenantId_userId: { tenantId, userId: requesterId } },
  });
  if (!requesterMembership || !["OWNER", "ADMIN"].includes(requesterMembership.role)) {
    throw new ForbiddenError("Only OWNER or ADMIN can update member roles");
  }

  const targetMember = await prisma.tenantMember.findUnique({
    where: { id: memberId },
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

  if (!targetMember || targetMember.tenantId !== tenantId) {
    throw new NotFoundError("Member", memberId);
  }

  // Prevent removing the last OWNER
  if (targetMember.role === "OWNER" && input.role !== "OWNER") {
    const ownerCount = await prisma.tenantMember.count({
      where: { tenantId, role: "OWNER" },
    });
    if (ownerCount <= 1) {
      throw new ForbiddenError("Cannot demote the last OWNER of a workspace");
    }
  }

  const updated = await prisma.tenantMember.update({
    where: { id: memberId },
    data: { role: input.role },
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

  return toMemberResponse(updated);
}

/**
 * Removes a member from the workspace. Cannot remove the last OWNER.
 */
export async function removeTenantMember(
  tenantId: string,
  requesterId: string,
  memberId: string,
): Promise<void> {
  const requesterMembership = await prisma.tenantMember.findUnique({
    where: { tenantId_userId: { tenantId, userId: requesterId } },
  });
  if (!requesterMembership || !["OWNER", "ADMIN"].includes(requesterMembership.role)) {
    throw new ForbiddenError("Only OWNER or ADMIN can remove members");
  }

  const targetMember = await prisma.tenantMember.findUnique({
    where: { id: memberId },
  });

  if (!targetMember || targetMember.tenantId !== tenantId) {
    throw new NotFoundError("Member", memberId);
  }

  if (targetMember.role === "OWNER") {
    const ownerCount = await prisma.tenantMember.count({
      where: { tenantId, role: "OWNER" },
    });
    if (ownerCount <= 1) {
      throw new ForbiddenError("Cannot remove the last OWNER of a workspace");
    }
  }

  await prisma.tenantMember.delete({ where: { id: memberId } });
}
