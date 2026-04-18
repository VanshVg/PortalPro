import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@portalpro/database";
import { authConfig } from "@portalpro/auth";

declare module "next-auth" {
  interface User {
    tenantId: string | null;
    role: string | null;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string | null;
      tenantId: string | null;
      role: string | null;
    };
  }
}

// Portal auth: portal client users log in here.
// The authConfig pages redirect to /login (portal login page).
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  cookies: {
    sessionToken: {
      name: "portalpro.portal.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (typeof credentials.email !== "string" || typeof credentials.password !== "string") {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            clientAccess: {
              select: { clientPortal: { select: { tenantId: true } } },
              take: 1,
            },
          },
        });

        if (!user?.passwordHash) return null;

        const isValid = await compare(credentials.password, user.passwordHash);
        if (!isValid) return null;

        const tenantId = user.clientAccess[0]?.clientPortal.tenantId ?? null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatarUrl,
          tenantId,
          role: "CLIENT" as string,
        };
      },
    }),
  ],
});
