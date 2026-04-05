import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth configuration (no Prisma / Node.js-only modules).
 * Used in middleware.ts which runs on the Edge runtime.
 */
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAuthRoute = nextUrl.pathname.startsWith("/login") ||
        nextUrl.pathname.startsWith("/signup") ||
        nextUrl.pathname.startsWith("/forgot-password") ||
        nextUrl.pathname.startsWith("/reset-password");

      if (isAuthRoute) {
        // Redirect signed-in users away from auth pages
        if (isLoggedIn) return Response.redirect(new URL("/", nextUrl));
        return true;
      }

      // All other routes require authentication
      if (!isLoggedIn) return false;
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.tenantId = (user as { tenantId?: string | null }).tenantId ?? null;
        token.role = (user as { role?: string | null }).role ?? null;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      const u = session.user as unknown as { tenantId: unknown; role: unknown };
      u.tenantId = token.tenantId;
      u.role = token.role;
      return session;
    },
  },
  providers: [], // Populated in auth.ts (Node.js only)
};
