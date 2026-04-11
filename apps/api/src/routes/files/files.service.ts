import { prisma } from "@portalpro/database";
import { NotFoundError, ForbiddenError } from "@portalpro/types";
import type {
  RequestPresignedUrlInput,
  ConfirmUploadInput,
  CreateFolderInput,
  FileResponse,
} from "@portalpro/types";
import {
  generatePresignedPutUrl,
  generatePresignedGetUrl,
  deleteR2Object,
  buildFileKey,
} from "../../lib/r2";

/**
 * Serializes a File DB record into a FileResponse DTO, including a signed download URL.
 */
async function toFileResponse(file: {
  id: string;
  name: string;
  key: string;
  size: number;
  mimeType: string;
  version: number;
  uploadedBy: string;
  folderId: string | null;
  createdAt: Date;
}): Promise<FileResponse> {
  const downloadUrl = await generatePresignedGetUrl(file.key);

  return {
    id: file.id,
    name: file.name,
    key: file.key,
    size: file.size,
    mimeType: file.mimeType,
    version: file.version,
    uploadedBy: file.uploadedBy,
    folderId: file.folderId,
    downloadUrl,
    createdAt: file.createdAt.toISOString(),
  };
}

/**
 * Generates a presigned R2 upload URL for a new file.
 * Returns the URL and the key that must be passed to confirmUpload.
 */
export async function requestPresignedUrl(
  tenantId: string,
  _userId: string,
  input: RequestPresignedUrlInput,
): Promise<{ uploadUrl: string; key: string }> {
  // Verify the project belongs to this tenant
  const project = await prisma.project.findUnique({
    where: { id: input.projectId },
    select: { tenantId: true },
  });
  if (!project || project.tenantId !== tenantId) {
    throw new NotFoundError("Project", input.projectId);
  }

  const key = buildFileKey(tenantId, input.projectId, input.fileName);
  const uploadUrl = await generatePresignedPutUrl(key, input.mimeType, input.fileSize);

  return { uploadUrl, key };
}

/**
 * Confirms a completed upload by creating a File record in the database.
 */
export async function confirmUpload(
  tenantId: string,
  userId: string,
  input: ConfirmUploadInput,
): Promise<FileResponse> {
  const project = await prisma.project.findUnique({
    where: { id: input.projectId },
    select: { tenantId: true },
  });
  if (!project || project.tenantId !== tenantId) {
    throw new NotFoundError("Project", input.projectId);
  }

  // Check for an existing version of this file by name+folder
  const existingFile = await prisma.file.findFirst({
    where: {
      projectId: input.projectId,
      name: input.name,
      folderId: input.folderId ?? null,
    },
    orderBy: { version: "desc" },
  });

  const newVersion = existingFile ? existingFile.version + 1 : 1;
  const parentId = existingFile?.id ?? null;

  const file = await prisma.file.create({
    data: {
      projectId: input.projectId,
      name: input.name,
      key: input.key,
      size: input.size,
      mimeType: input.mimeType,
      version: newVersion,
      uploadedBy: userId,
      folderId: input.folderId ?? null,
      parentId,
    },
  });

  return toFileResponse(file);
}

/**
 * Lists files within a project, optionally scoped to a folder.
 * Only returns the latest version of each file.
 */
export async function listFiles(
  tenantId: string,
  projectId: string,
  folderId?: string | null,
): Promise<FileResponse[]> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { tenantId: true },
  });
  if (!project || project.tenantId !== tenantId) {
    throw new NotFoundError("Project", projectId);
  }

  // Get latest version of each unique file name
  const files = await prisma.file.findMany({
    where: {
      projectId,
      folderId: folderId ?? null,
      // Only latest versions: files that are not referenced as a parent by another file
      versions: { none: {} },
    },
    orderBy: { createdAt: "desc" },
  });

  return Promise.all(files.map(toFileResponse));
}

/**
 * Deletes a file and all its versions from R2 and the database.
 * Only the file uploader, ADMIN, or OWNER can delete.
 */
export async function deleteFile(
  tenantId: string,
  fileId: string,
  userId: string,
): Promise<void> {
  const file = await prisma.file.findUnique({
    where: { id: fileId },
    include: { project: { select: { tenantId: true } } },
  });

  if (!file || file.project.tenantId !== tenantId) {
    throw new NotFoundError("File", fileId);
  }

  // Check delete permission
  const membership = await prisma.tenantMember.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
  });

  const canDelete =
    file.uploadedBy === userId ||
    (membership && ["OWNER", "ADMIN"].includes(membership.role));

  if (!canDelete) {
    throw new ForbiddenError("You do not have permission to delete this file");
  }

  // Delete all version keys from R2
  const allVersions = await prisma.file.findMany({
    where: { OR: [{ id: fileId }, { parentId: fileId }] },
    select: { id: true, key: true },
  });

  await Promise.all(allVersions.map((v) => deleteR2Object(v.key)));

  // Cascade delete from database (parentId → children auto-deleted if FK cascades,
  // but we delete manually to be safe)
  const versionIds = allVersions.map((v) => v.id);
  await prisma.file.deleteMany({ where: { id: { in: versionIds } } });
}

/**
 * Deletes a folder and all its descendant folders and files (from R2 and DB).
 * Walks the subtree via BFS, then deletes bottom-up to satisfy FK constraints.
 */
export async function deleteFolder(
  tenantId: string,
  folderId: string,
  userId: string,
): Promise<void> {
  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
    include: { project: { select: { tenantId: true } } },
  });

  if (!folder || folder.project.tenantId !== tenantId) {
    throw new NotFoundError("Folder", folderId);
  }

  // EDITOR+ can delete folders (same requirement as creating them)
  const membership = await prisma.tenantMember.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
  });
  if (!membership || !["OWNER", "ADMIN", "EDITOR"].includes(membership.role)) {
    throw new ForbiddenError("You do not have permission to delete this folder");
  }

  // BFS to collect the full subtree of folder IDs (root-first order)
  const allFolderIds: string[] = [];
  const queue: string[] = [folderId];
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    allFolderIds.push(currentId);
    const children = await prisma.folder.findMany({
      where: { parentId: currentId },
      select: { id: true },
    });
    queue.push(...children.map((c) => c.id));
  }

  // Delete all files inside every folder in the subtree from R2 + DB
  const files = await prisma.file.findMany({
    where: { folderId: { in: allFolderIds } },
    select: { id: true, key: true },
  });

  if (files.length > 0) {
    await Promise.all(files.map((f) => deleteR2Object(f.key)));
    await prisma.file.deleteMany({ where: { id: { in: files.map((f) => f.id) } } });
  }

  // Delete folders deepest-first (reverse of BFS) to avoid FK violations
  for (const id of [...allFolderIds].reverse()) {
    await prisma.folder.delete({ where: { id } });
  }
}

/**
 * Creates a folder within a project.
 */
export async function createFolder(
  tenantId: string,
  _userId: string,
  input: CreateFolderInput,
): Promise<{ id: string; name: string; projectId: string; parentId: string | null }> {
  const project = await prisma.project.findUnique({
    where: { id: input.projectId },
    select: { tenantId: true },
  });
  if (!project || project.tenantId !== tenantId) {
    throw new NotFoundError("Project", input.projectId);
  }

  const folder = await prisma.folder.create({
    data: {
      projectId: input.projectId,
      name: input.name,
      parentId: input.parentId ?? null,
    },
  });

  return {
    id: folder.id,
    name: folder.name,
    projectId: folder.projectId,
    parentId: folder.parentId,
  };
}

/**
 * Lists folders within a project, optionally scoped to a parent folder.
 */
export async function listFolders(
  tenantId: string,
  projectId: string,
  parentId?: string | null,
): Promise<Array<{ id: string; name: string; projectId: string; parentId: string | null }>> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { tenantId: true },
  });
  if (!project || project.tenantId !== tenantId) {
    throw new NotFoundError("Project", projectId);
  }

  const folders = await prisma.folder.findMany({
    where: { projectId, parentId: parentId ?? null },
    orderBy: { name: "asc" },
  });

  return folders.map((f) => ({
    id: f.id,
    name: f.name,
    projectId: f.projectId,
    parentId: f.parentId,
  }));
}
