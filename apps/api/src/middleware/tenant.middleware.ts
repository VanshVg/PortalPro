import type { Request, Response, NextFunction } from "express";
import { prisma } from "@portalpro/database";
import { NotFoundError, UnauthorizedError } from "@portalpro/types";

// Extend Request to carry resolved tenant
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      tenantId?: string;
    }
  }
}

/**
 * Resolves the current tenant from multiple sources (in priority order):
 *
 * 1. `X-Tenant-ID` request header  — used by internal Next.js server calls
 * 2. `Host` header custom domain    — used for white-label portal domains
 * 3. Session JWT `tenantId` claim   — fallback when req.user is set
 *
 * Sets `req.tenantId` and rejects requests with no resolvable tenant.
 * Must be used after `authMiddleware`.
 */
export async function tenantMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  // 1. Explicit header (internal service-to-service)
  const headerTenantId = req.headers["x-tenant-id"] as string | undefined;
  if (headerTenantId) {
    req.tenantId = headerTenantId;
    next();
    return;
  }

  // 2. Custom domain resolution
  const host = req.headers.host?.split(":")[0];
  const internalHosts = ["localhost", "127.0.0.1", "api.portalpro.app"];
  if (host && !internalHosts.includes(host)) {
    const tenant = await prisma.tenant.findFirst({
      where: { customDomain: host },
      select: { id: true },
    });
    if (tenant) {
      req.tenantId = tenant.id;
      next();
      return;
    }

    const portal = await prisma.clientPortal.findFirst({
      where: { customDomain: host },
      select: { tenantId: true },
    });
    if (portal) {
      req.tenantId = portal.tenantId;
      next();
      return;
    }

    next(new NotFoundError("Tenant", host));
    return;
  }

  // 3. Session JWT tenantId claim
  if (req.user?.tenantId) {
    req.tenantId = req.user.tenantId;
    next();
    return;
  }

  next(new UnauthorizedError("Could not resolve tenant for this request"));
}
