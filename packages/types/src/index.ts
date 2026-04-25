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
  ClientPortalAccessResponse,
  MessageAttachmentResponse,
  CommentResponse,
  TimeEntryResponse,
  FolderResponse,
} from "./api-contracts";

// Zod Schemas (shared between API validation and frontend forms)
export {
  createProjectSchema,
  updateProjectSchema,
  createTaskSchema,
  updateTaskSchema,
  createMilestoneSchema,
  updateMilestoneSchema,
  reorderMilestonesSchema,
  reorderTasksSchema,
  createCommentSchema,
  createTimeEntrySchema,
  updateTimeEntrySchema,
  invoiceLineItemSchema,
  createInvoiceSchema,
  updateInvoiceSchema,
  sendInvoiceSchema,
  createMessageSchema,
  createDeliverableSchema,
  updateDeliverableSchema,
  requestRevisionSchema,
  paginationSchema,
  updateTenantSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
  createPortalSchema,
  updatePortalSchema,
  inviteClientSchema,
  requestPresignedUrlSchema,
  confirmUploadSchema,
  createFolderSchema,
} from "./schemas";

export type {
  CreateProjectInput,
  UpdateProjectInput,
  CreateTaskInput,
  UpdateTaskInput,
  CreateMilestoneInput,
  UpdateMilestoneInput,
  ReorderMilestonesInput,
  ReorderTasksInput,
  CreateCommentInput,
  CreateTimeEntryInput,
  UpdateTimeEntryInput,
  InvoiceLineItem,
  CreateInvoiceInput,
  UpdateInvoiceInput,
  SendInvoiceInput,
  CreateMessageInput,
  CreateDeliverableInput,
  UpdateDeliverableInput,
  RequestRevisionInput,
  PaginationInput,
  UpdateTenantInput,
  InviteMemberInput,
  UpdateMemberRoleInput,
  CreatePortalInput,
  UpdatePortalInput,
  InviteClientInput,
  RequestPresignedUrlInput,
  ConfirmUploadInput,
  CreateFolderInput,
} from "./schemas";

// API Response Wrapper
export type { ApiResponse, ApiErrorResponse, PaginatedResponse } from "./api-response";
