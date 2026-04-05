import NextAuth from "next-auth";
import { authConfig } from "@portalpro/auth";

// Portal-specific auth config: unauthenticated portal users redirect to /login
const portalAuthConfig = {
  ...authConfig,
  pages: {
    signIn: "/login",
    error: "/login",
  },
};

export const { auth: middleware } = NextAuth(portalAuthConfig);

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon|logo-|sitemap|robots|api/auth).*)",
  ],
};
