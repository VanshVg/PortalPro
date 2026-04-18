import { prisma } from "@portalpro/database";
import { NotFoundError, ForbiddenError } from "@portalpro/types";
import { broadcastNewMessage } from "../../lib/socket";
import type { MessageResponse, UserResponse, CreateMessageInput } from "@portalpro/types";

// ===== Serializer =====

function toUserResponse(u: {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  locale: string;
  timezone: string;
}): UserResponse {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    avatarUrl: u.avatarUrl,
    locale: u.locale,
    timezone: u.timezone,
  };
}

function toMessageResponse(m: {
  id: string;
  content: string;
  threadId: string | null;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
  author: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
    locale: string;
    timezone: string;
  };
  attachments: {
    id: string;
    fileKey: string;
    fileName: string;
    mimeType: string;
    size: number;
  }[];
  _count?: { replies: number };
}): MessageResponse {
  return {
    id: m.id,
    content: m.content,
    author: toUserResponse(m.author),
    threadId: m.threadId,
    isRead: m.isRead,
    replyCount: m._count?.replies,
    attachments: m.attachments.map((a) => ({
      id: a.id,
      fileKey: a.fileKey,
      fileName: a.fileName,
      mimeType: a.mimeType,
      size: a.size,
    })),
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}

/**
 * Verifies a project belongs to the tenant.
 */
async function requireProjectAccess(tenantId: string, projectId: string): Promise<void> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { tenantId: true },
  });
  if (!project || project.tenantId !== tenantId) {
    throw new NotFoundError("Project", projectId);
  }
}

// ===== Message CRUD =====

/**
 * Lists top-level messages (threadId = null) for a project, paginated.
 * Replies are not included in this list — fetch them via getThread.
 */
export async function listMessages(
  tenantId: string,
  projectId: string,
  page: number,
  limit: number,
): Promise<{ data: MessageResponse[]; total: number }> {
  await requireProjectAccess(tenantId, projectId);

  const [messages, total] = await prisma.$transaction([
    prisma.message.findMany({
      where: { projectId, threadId: null },
      include: {
        author: true,
        attachments: true,
        _count: { select: { replies: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.message.count({ where: { projectId, threadId: null } }),
  ]);

  return {
    data: messages.map(toMessageResponse),
    total,
  };
}

/**
 * Gets a single thread: the parent message + all replies in chronological order.
 */
export async function getThread(
  tenantId: string,
  messageId: string,
): Promise<{ parent: MessageResponse; replies: MessageResponse[] }> {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      project: { select: { tenantId: true } },
      author: true,
      attachments: true,
      _count: { select: { replies: true } },
      replies: {
        include: {
          author: true,
          attachments: true,
          _count: { select: { replies: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!message || message.project.tenantId !== tenantId) {
    throw new NotFoundError("Message", messageId);
  }

  return {
    parent: toMessageResponse(message),
    replies: message.replies.map(toMessageResponse),
  };
}

/**
 * Sends a message or a reply in a project thread.
 */
export async function sendMessage(
  tenantId: string,
  projectId: string,
  authorId: string,
  input: CreateMessageInput,
): Promise<MessageResponse> {
  await requireProjectAccess(tenantId, projectId);

  // If replying, validate parent belongs to this project
  if (input.threadId) {
    const parent = await prisma.message.findUnique({
      where: { id: input.threadId },
      select: { projectId: true, threadId: true },
    });
    if (!parent || parent.projectId !== projectId) {
      throw new NotFoundError("Message (thread parent)", input.threadId);
    }
    // Only allow one level of threading
    if (parent.threadId !== null) {
      throw new ForbiddenError("Replies to replies are not supported. Reply to the parent message.");
    }
  }

  const message = await prisma.message.create({
    data: {
      projectId,
      authorId,
      content: input.content,
      threadId: input.threadId ?? null,
    },
    include: {
      author: true,
      attachments: true,
      _count: { select: { replies: true } },
    },
  });

  const response = toMessageResponse(message);
  broadcastNewMessage(projectId, response);
  return response;
}

/**
 * Marks all top-level messages in a project as read, excluding messages
 * authored by the current user (a user's own sent messages are never "unread" for them).
 * Returns the number of messages updated so the client can decrement its badge.
 */
export async function markAllProjectMessagesRead(
  tenantId: string,
  projectId: string,
  currentUserId: string,
): Promise<number> {
  await requireProjectAccess(tenantId, projectId);
  const { count } = await prisma.message.updateMany({
    where: {
      projectId,
      threadId: null,
      isRead: false,
      authorId: { not: currentUserId },
    },
    data: { isRead: true },
  });
  return count;
}

/**
 * Marks a message as read by the current user.
 * (Simple isRead flag — per-user read receipts would need a join table.)
 */
export async function markMessageRead(tenantId: string, messageId: string): Promise<void> {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: { project: { select: { tenantId: true } } },
  });

  if (!message || message.project.tenantId !== tenantId) {
    throw new NotFoundError("Message", messageId);
  }

  await prisma.message.update({
    where: { id: messageId },
    data: { isRead: true },
  });
}

/**
 * Deletes a message. Authors can delete their own; ADMIN+ can delete any.
 */
export async function deleteMessage(
  tenantId: string,
  messageId: string,
  requesterId: string,
  requesterRole: string,
): Promise<void> {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: { project: { select: { tenantId: true } } },
  });

  if (!message || message.project.tenantId !== tenantId) {
    throw new NotFoundError("Message", messageId);
  }

  const canDelete =
    message.authorId === requesterId || ["OWNER", "ADMIN"].includes(requesterRole);
  if (!canDelete) {
    throw new ForbiddenError("You can only delete your own messages.");
  }

  await prisma.message.delete({ where: { id: messageId } });
}
