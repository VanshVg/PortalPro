import type { MemberRole } from "@portalpro/types";

/**
 * Session user shape stored in the JWT.
 * Available via `auth()` or `getServerSession()` in Next.js pages.
 */
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  tenantId: string | null;
  role: MemberRole | null;
}
