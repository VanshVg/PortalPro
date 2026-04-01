import { PrismaClient } from "@prisma/client";

/**
 * Creates a new Prisma client instance.
 * In development, reuses a global instance to avoid connection pool exhaustion during HMR.
 */
export function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/** Singleton Prisma client. Reused across hot reloads in development. */
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
