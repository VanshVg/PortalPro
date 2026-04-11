import { z } from "zod";

// ============================================
// Shared Zod Schemas — used by both API validation and frontend forms
// ============================================

/** Pagination query parameters. */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationInput = z.infer<typeof paginationSchema>;

/** Create a new project. */
export const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(200),
  description: z.string().max(2000).optional(),
  clientPortalId: z.string().cuid(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

/** Update an existing project. */
export const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ON_HOLD", "COMPLETED", "ARCHIVED"]).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

/** Create a new task. */
export const createTaskSchema = z.object({
  title: z.string().min(1, "Task title is required").max(200),
  description: z.string().max(2000).optional(),
  milestoneId: z.string().cuid().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  assigneeId: z.string().cuid().optional(),
  dueDate: z.coerce.date().optional(),
  blockedById: z.string().cuid().optional(),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

/** Update an existing task. */
export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  milestoneId: z.string().cuid().nullable().optional(),
  assigneeId: z.string().cuid().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  sortOrder: z.number().int().optional(),
  blockedById: z.string().cuid().nullable().optional(),
});
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

/** Create a new milestone. */
export const createMilestoneSchema = z.object({
  title: z.string().min(1, "Milestone title is required").max(200),
  description: z.string().max(2000).optional(),
  dueDate: z.coerce.date().optional(),
  sortOrder: z.number().int().default(0),
});
export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;

/** Update an existing milestone. */
export const updateMilestoneSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  sortOrder: z.number().int().optional(),
  isCompleted: z.boolean().optional(),
});
export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>;

/** Reorder milestones. */
export const reorderMilestonesSchema = z.object({
  orderedIds: z.array(z.string().cuid()),
});
export type ReorderMilestonesInput = z.infer<typeof reorderMilestonesSchema>;

/** Reorder tasks within a column/project. */
export const reorderTasksSchema = z.object({
  orderedIds: z.array(z.string().cuid()),
});
export type ReorderTasksInput = z.infer<typeof reorderTasksSchema>;

/** Create a comment on a task. */
export const createCommentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(5000),
});
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

/** Create a time entry. */
export const createTimeEntrySchema = z.object({
  projectId: z.string().cuid(),
  taskId: z.string().cuid().nullable().optional(),
  description: z.string().max(500).optional(),
  minutes: z.number().int().positive("Must be at least 1 minute").max(1440, "Cannot exceed 24 hours"),
  date: z.coerce.date(),
  billable: z.boolean(),
});
export type CreateTimeEntryInput = z.infer<typeof createTimeEntrySchema>;

/** Update a time entry. */
export const updateTimeEntrySchema = z.object({
  description: z.string().max(500).optional(),
  minutes: z.number().int().positive().max(1440).optional(),
  date: z.coerce.date().optional(),
  billable: z.boolean().optional(),
});
export type UpdateTimeEntryInput = z.infer<typeof updateTimeEntrySchema>;

/** Create an invoice. */
export const createInvoiceSchema = z.object({
  number: z.string().min(1, "Invoice number is required").max(50),
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().length(3, "Currency must be 3-letter ISO code").default("USD"),
  dueDate: z.coerce.date().optional(),
  projectId: z.string().cuid().optional(),
});
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

/** Send a message in a project thread. */
export const createMessageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty").max(10000),
  threadId: z.string().cuid().optional(),
});
export type CreateMessageInput = z.infer<typeof createMessageSchema>;

/** Create a deliverable. */
export const createDeliverableSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional(),
  fileIds: z.array(z.string().cuid()).default([]),
});
export type CreateDeliverableInput = z.infer<typeof createDeliverableSchema>;

// ============================================
// Phase 2: Tenant, Team, Portal, File Schemas
// ============================================

/** Update workspace (tenant) general settings. */
export const updateTenantSchema = z.object({
  name: z.string().min(1, "Workspace name is required").max(200).optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color").optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color").optional(),
  customDomain: z.string().max(200).nullable().optional(),
});
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;

/** Invite a team member to the workspace. */
export const inviteMemberSchema = z.object({
  email: z.string().email("Valid email is required"),
  name: z.string().min(1, "Name is required").max(200),
  role: z.enum(["OWNER", "ADMIN", "EDITOR", "VIEWER"]).default("EDITOR"),
});
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

/** Update a team member's role. */
export const updateMemberRoleSchema = z.object({
  role: z.enum(["OWNER", "ADMIN", "EDITOR", "VIEWER"]),
});
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

/** Create a client portal. */
export const createPortalSchema = z.object({
  name: z.string().min(1, "Portal name is required").max(200),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens")
    .optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  customDomain: z.string().max(200).nullable().optional(),
});
export type CreatePortalInput = z.infer<typeof createPortalSchema>;

/** Update a client portal's settings. */
export const updatePortalSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  customDomain: z.string().max(200).nullable().optional(),
  isActive: z.boolean().optional(),
});
export type UpdatePortalInput = z.infer<typeof updatePortalSchema>;

/** Invite a client user to a portal. */
export const inviteClientSchema = z.object({
  email: z.string().email("Valid email is required"),
  name: z.string().min(1, "Name is required").max(200),
  role: z.enum(["ADMIN", "VIEWER"]).default("VIEWER"),
});
export type InviteClientInput = z.infer<typeof inviteClientSchema>;

/** Request a presigned upload URL for a file. */
export const requestPresignedUrlSchema = z.object({
  fileName: z.string().min(1).max(500),
  mimeType: z.string().min(1).max(200),
  fileSize: z.number().int().positive().max(100 * 1024 * 1024, "File must be under 100 MB"),
  projectId: z.string().cuid(),
  folderId: z.string().cuid().nullable().optional(),
});
export type RequestPresignedUrlInput = z.infer<typeof requestPresignedUrlSchema>;

/** Confirm a completed file upload. */
export const confirmUploadSchema = z.object({
  name: z.string().min(1).max(500),
  key: z.string().min(1),
  size: z.number().int().positive(),
  mimeType: z.string().min(1).max(200),
  projectId: z.string().cuid(),
  folderId: z.string().cuid().nullable().optional(),
});
export type ConfirmUploadInput = z.infer<typeof confirmUploadSchema>;

/** Create a folder within a project. */
export const createFolderSchema = z.object({
  name: z.string().min(1, "Folder name is required").max(200),
  projectId: z.string().cuid(),
  parentId: z.string().cuid().nullable().optional(),
});
export type CreateFolderInput = z.infer<typeof createFolderSchema>;
