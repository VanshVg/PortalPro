import type { MemberRole } from "@portalpro/types";

/**
 * Role hierarchy for permission comparison.
 * Higher number = more permissions.
 */
export const ROLE_HIERARCHY: Record<MemberRole, number> = {
  OWNER: 40,
  ADMIN: 30,
  EDITOR: 20,
  VIEWER: 10,
};

/**
 * Checks if a user's role meets the minimum required role.
 *
 * @param userRole - The user's current role
 * @param requiredRole - The minimum role required
 * @returns true if the user has sufficient permissions
 *
 * @example
 * hasMinimumRole("ADMIN", "EDITOR") // true (ADMIN > EDITOR)
 * hasMinimumRole("VIEWER", "EDITOR") // false (VIEWER < EDITOR)
 */
export function hasMinimumRole(userRole: MemberRole, requiredRole: MemberRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Asserts that a user has the minimum required role.
 * Throws ForbiddenError if the check fails.
 *
 * @param userRole - The user's current role
 * @param requiredRole - The minimum role required
 * @throws ForbiddenError if insufficient permissions
 */
export function requireRole(userRole: MemberRole, requiredRole: MemberRole): void {
  if (!hasMinimumRole(userRole, requiredRole)) {
    throw new Error(`Requires ${requiredRole} role or higher. Current role: ${userRole}`);
  }
}
