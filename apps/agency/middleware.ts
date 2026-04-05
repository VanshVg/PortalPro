import NextAuth from "next-auth";
import { authConfig } from "@portalpro/auth";

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon, logo assets
     * - /api/auth (NextAuth routes — must be public)
     */
    "/((?!_next/static|_next/image|favicon|logo-|sitemap|robots|api/auth).*)",
  ],
};
