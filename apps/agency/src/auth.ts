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
            tenantMembers: {
              select: { tenantId: true, role: true },
              orderBy: { tenant: { createdAt: "asc" } },
              take: 1,
            },
          },
        });

        if (!user?.passwordHash) return null;
        if (!user.emailVerified) return null; // block unverified accounts at NextAuth level

        const isValid = await compare(credentials.password, user.passwordHash);
        if (!isValid) return null;

        const membership = user.tenantMembers[0] ?? null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatarUrl,
          tenantId: membership?.tenantId ?? null,
          role: membership?.role ?? null,
        };
      },
    }),
  ],
});
