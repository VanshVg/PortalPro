import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { UnauthorizedError, ForbiddenError } from "@portalpro/types";
import { hasMinimumRole } from "@portalpro/auth";
import type { MemberRole } from "@portalpro/types";

/**
 * Returns the current session user, or null if not authenticated.
 * Use in Server Components and Server Actions.
 */
export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return session.user;
}

/**
 * Returns the current session user or redirects to /login.
 * Use in Server Components that require authentication.
 */
export async function requireSession() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session.user;
}

/**
 * Returns the current user or throws if they don't have the required role.
 * Use in Server Actions / API routes.
 */
export async function requireSessionWithRole(minimumRole: MemberRole) {
  const session = await auth();
  if (!session?.user) throw new UnauthorizedError();
  const role = (session.user.role as MemberRole | null) ?? "VIEWER";
  if (!hasMinimumRole(role, minimumRole)) {
    throw new ForbiddenError(`Requires ${minimumRole} role or higher`);
  }
  return session.user;
}
