import { PrismaClient } from "@prisma/client";
import { IS_DEVELOPMENT, IS_PRODUCTION } from "./env";

/**
 * Creates a new Prisma client instance.
 * In development, reuses a global instance to avoid connection pool exhaustion during HMR.
 */
export function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: IS_DEVELOPMENT ? ["query", "error", "warn"] : ["error"],
    // Retry logic: on transient connection failures Prisma will retry up to 3 times
    // before surfacing the error. Handles brief Supabase PgBouncer hiccups.
    datasourceUrl: process.env.DATABASE_URL,
  });

  // Attempt an eager connection so startup failures are visible immediately
  // rather than surfacing on the first user request.
  client.$connect().catch((err: unknown) => {
    console.error("[Prisma] Initial connection failed:", err);
  });

  return client;
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/** Singleton Prisma client. Reused across hot reloads in development. */
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (!IS_PRODUCTION) {
  globalForPrisma.prisma = prisma;
}
