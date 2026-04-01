// ============================================
// @portalpro/types — Shared TypeScript Types & API Contracts
// ============================================

// Enums
export {
  type Plan,
  type MemberRole,
  type ClientRole,
  type ProjectStatus,
  type TaskStatus,
  type Priority,
  type DeliverableStatus,
  type InvoiceStatus,
} from "./enums";

// Error Classes
export { AppError, NotFoundError, ForbiddenError, ValidationError, UnauthorizedError } from "./errors";
export type { ErrorCode } from "./errors";

// API Contracts
export type {
  TenantResponse,
  UserResponse,
  ProjectResponse,
  ProjectSummary,
  TaskResponse,
  MilestoneResponse,
  FileResponse,
  MessageResponse,
  DeliverableResponse,
  InvoiceResponse,
  ClientPortalResponse,
  TenantMemberResponse,
} from "./api-contracts";

// Zod Schemas (shared between API validation and frontend forms)
export {
  createProjectSchema,
  updateProjectSchema,
  createTaskSchema,
  updateTaskSchema,
  createMilestoneSchema,
  createInvoiceSchema,
  createMessageSchema,
  createDeliverableSchema,
  paginationSchema,
} from "./schemas";

export type {
  CreateProjectInput,
  UpdateProjectInput,
  CreateTaskInput,
  UpdateTaskInput,
  CreateMilestoneInput,
  CreateInvoiceInput,
  CreateMessageInput,
  CreateDeliverableInput,
  PaginationInput,
} from "./schemas";

// API Response Wrapper
export type { ApiResponse, ApiErrorResponse, PaginatedResponse } from "./api-response";
