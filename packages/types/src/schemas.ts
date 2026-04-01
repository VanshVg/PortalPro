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
