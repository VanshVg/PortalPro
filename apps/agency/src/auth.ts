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

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    /**
     * Override jwt callback to always re-fetch the user's live tenant membership.
     *
     * The base config only sets tenantId/role when `user` is present (sign-in only).
     * This means a JWT created before onboarding completes has role: null and never
     * gets refreshed. Re-fetching on every token read ensures the role is always current.
     */
    async jwt({ token, user, account, profile, trigger, session, isNewUser }) {
      // Run base config first — handles sign-in case (writes id, tenantId, role from user)
      const base = authConfig.callbacks!.jwt!;
      const updatedToken = (await base({ token, user, account, profile, trigger, session, isNewUser })) ?? token;

      // Always re-fetch live membership so stale JWTs pick up role changes
      const userId = updatedToken["id"] as string | undefined;
      if (userId) {
        const membership = await prisma.tenantMember.findFirst({
          where: { userId },
          select: { tenantId: true, role: true },
          orderBy: { tenant: { createdAt: "asc" } },
        });
        updatedToken["tenantId"] = membership?.tenantId ?? (updatedToken["tenantId"] as string | null | undefined) ?? null;
        updatedToken["role"] = membership?.role ?? null;
      }

      return updatedToken;
    },
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
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
            passwordHash: true,
            emailVerified: true,
          },
        });

        if (!user?.passwordHash) return null;
        if (!user.emailVerified) return null;

        const isValid = await compare(credentials.password, user.passwordHash);
        if (!isValid) return null;

        // Return without tenantId/role — the jwt() callback above fetches them live
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatarUrl,
          tenantId: null,
          role: null,
        };
      },
    }),
  ],
});
