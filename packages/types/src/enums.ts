/**
 * Subscription plan tiers.
 */
export type Plan = "FREE" | "STARTER" | "PROFESSIONAL" | "ENTERPRISE";

/**
 * Roles for agency team members within a tenant.
 * Hierarchy: OWNER > ADMIN > EDITOR > VIEWER
 */
export type MemberRole = "OWNER" | "ADMIN" | "EDITOR" | "VIEWER";

/**
 * Roles for client users within a portal.
 */
export type ClientRole = "ADMIN" | "VIEWER";

/**
 * Project lifecycle status.
 */
export type ProjectStatus = "DRAFT" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "ARCHIVED";

/**
 * Task workflow status (Kanban columns).
 */
export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";

/**
 * Task priority levels.
 */
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

/**
 * Deliverable approval workflow status.
 *
 * Flow: DRAFT → SUBMITTED → APPROVED → FINAL
 *                 └→ REVISION_REQUESTED → DRAFT (cycle)
 */
export type DeliverableStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REVISION_REQUESTED" | "FINAL";

/**
 * Invoice payment status.
 */
export type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED";

/** Role hierarchy values for comparison. Higher = more permission. */
export const MEMBER_ROLE_HIERARCHY: Record<string, number> = {
  OWNER: 40,
  ADMIN: 30,
  EDITOR: 20,
  VIEWER: 10,
};
