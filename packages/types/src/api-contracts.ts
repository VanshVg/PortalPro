import type {
  ClientRole,
  DeliverableStatus,
  InvoiceStatus,
  MemberRole,
  Plan,
  Priority,
  ProjectStatus,
  TaskStatus,
} from "./enums";
import type { InvoiceLineItem } from "./schemas";

/** Tenant (workspace) response shape. */
export interface TenantResponse {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  primaryColor: string;
  secondaryColor: string;
  customDomain: string | null;
  plan: Plan;
  createdAt: string;
}

/** Public user profile. */
export interface UserResponse {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  locale: string;
  timezone: string;
}

/** Tenant member (team member within a workspace). */
export interface TenantMemberResponse {
  id: string;
  role: MemberRole;
  user: UserResponse;
}

/** Client portal response. */
export interface ClientPortalResponse {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  primaryColor: string | null;
  customDomain: string | null;
  isActive: boolean;
  projectCount?: number;
  lastActivity?: string;
}

/** Full project response. */
export interface ProjectResponse {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  startDate: string | null;
  endDate: string | null;
  clientPortalId: string;
  milestones?: MilestoneResponse[];
  taskCount?: number;
  completedTaskCount?: number;
  createdAt: string;
  updatedAt: string;
}

/** Lightweight project summary for lists. */
export interface ProjectSummary {
  id: string;
  name: string;
  status: ProjectStatus;
  progress: number;
  lastUpdated: string;
}

/** Milestone within a project. */
export interface MilestoneResponse {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  sortOrder: number;
  isCompleted: boolean;
  taskCount?: number;
  completedTaskCount?: number;
}

/** Task response. */
export interface TaskResponse {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  assigneeId: string | null;
  assignee?: UserResponse;
  milestoneId: string | null;
  number: number;
  dueDate: string | null;
  sortOrder: number;
  blockedById: string | null;
  commentCount?: number;
  createdAt: string;
  updatedAt: string;
}

/** File metadata response. */
export interface FileResponse {
  id: string;
  name: string;
  key: string;
  size: number;
  mimeType: string;
  version: number;
  uploadedBy: string;
  folderId: string | null;
  previewUrl?: string;
  downloadUrl?: string;
  createdAt: string;
}

/** Message in project thread. */
export interface MessageResponse {
  id: string;
  content: string;
  author: UserResponse;
  threadId: string | null;
  isRead: boolean;
  replyCount?: number;
  attachments?: MessageAttachmentResponse[];
  createdAt: string;
  updatedAt: string;
}

/** Message attachment metadata. */
export interface MessageAttachmentResponse {
  id: string;
  fileKey: string;
  fileName: string;
  mimeType: string;
  size: number;
}

/** Deliverable response. */
export interface DeliverableResponse {
  id: string;
  title: string;
  description: string | null;
  status: DeliverableStatus;
  fileIds: string[];
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  feedback: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/** Invoice response. */
export interface InvoiceResponse {
  id: string;
  number: string;
  clientEmail: string | null;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  dueDate: string | null;
  paidAt: string | null;
  stripeLink: string | null;
  projectId: string | null;
  notes: string | null;
  lineItems: InvoiceLineItem[];
  createdAt: string;
  updatedAt: string;
}

/** Client portal access (who has access). */
export interface ClientPortalAccessResponse {
  id: string;
  userId: string;
  user: UserResponse;
  role: ClientRole;
  invitedAt: string;
  acceptedAt: string | null;
}

/** Comment on a task. */
export interface CommentResponse {
  id: string;
  content: string;
  author: UserResponse;
  createdAt: string;
}

/** Time entry response. */
export interface TimeEntryResponse {
  id: string;
  projectId: string;
  taskId: string | null;
  user: UserResponse;
  description: string | null;
  minutes: number;
  date: string;
  billable: boolean;
  createdAt: string;
}

/** Folder response. */
export interface FolderResponse {
  id: string;
  name: string;
  parentId: string | null;
  projectId: string;
}
