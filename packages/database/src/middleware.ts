import { Prisma } from "./generated/client";

/** Models that require tenant-scoped queries. */
const TENANT_SCOPED_MODELS = [
  "Project",
  "ClientPortal",
  "Invoice",
  "Webhook",
  "AuditLog",
];

/**
 * Prisma middleware that enforces tenant data isolation.
 *
 * - On CREATE: auto-injects `tenantId` into the data
 * - On READ/UPDATE/DELETE: auto-filters queries by `tenantId`
 *
 * This ensures that no tenant can accidentally (or maliciously) access
 * another tenant's data, even if application code forgets the filter.
 *
 * @param tenantId - The ID of the current tenant (from auth middleware)
 * @returns Prisma middleware function
 */
export function tenantMiddleware(tenantId: string): Prisma.Middleware {
  return async (params, next) => {
    if (!TENANT_SCOPED_MODELS.includes(params.model ?? "")) {
      return next(params);
    }

    // Auto-inject tenantId on create
    if (params.action === "create") {
      params.args.data = { ...params.args.data, tenantId };
    }

    if (params.action === "createMany") {
      params.args.data = params.args.data.map(
        (item: Record<string, unknown>) => ({ ...item, tenantId }),
      );
    }

    // Auto-filter on read/update/delete operations
    const filterActions = [
      "findMany",
      "findFirst",
      "findUnique",
      "update",
      "updateMany",
      "delete",
      "deleteMany",
      "count",
      "aggregate",
    ];

    if (filterActions.includes(params.action)) {
      params.args.where = { ...params.args.where, tenantId };
    }

    return next(params);
  };
}
