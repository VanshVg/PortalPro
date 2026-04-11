import type { Request, Response, NextFunction } from "express";
import {
  requestPresignedUrlSchema,
  confirmUploadSchema,
  createFolderSchema,
} from "@portalpro/types";
import {
  requestPresignedUrl,
  confirmUpload,
  listFiles,
  deleteFile,
  createFolder,
  listFolders,
  deleteFolder,
} from "./files.service";
import { logger } from "../../lib/logger";

/**
 * POST /api/v1/files/presigned-url
 * Returns a presigned R2 PUT URL for direct browser upload.
 */
export async function postPresignedUrl(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = requestPresignedUrlSchema.parse(req.body);
    const result = await requestPresignedUrl(req.tenantId!, req.user!.id, input);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/files/confirm
 * Confirms a completed upload and creates the File record.
 */
export async function postConfirmUpload(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = confirmUploadSchema.parse(req.body);
    const file = await confirmUpload(req.tenantId!, req.user!.id, input);
    logger.info({ tenantId: req.tenantId, fileId: file.id }, "File upload confirmed");
    res.status(201).json({ data: file });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/files?projectId=<id>&folderId=<id>
 */
export async function getFiles(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projectId = req.query["projectId"] as string | undefined;
    const folderId = (req.query["folderId"] as string | undefined) ?? null;

    if (!projectId) {
      res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "projectId query param is required" },
      });
      return;
    }

    const files = await listFiles(req.tenantId!, projectId, folderId);
    res.json({ data: files });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/files/:fileId
 */
export async function deleteFileById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const fileId = req.params["fileId"] as string;
    await deleteFile(req.tenantId!, fileId, req.user!.id);
    logger.info({ tenantId: req.tenantId, fileId }, "File deleted");
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/files/folders?projectId=<id>&parentId=<id>
 */
export async function getFolders(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const projectId = req.query["projectId"] as string | undefined;
    const parentId = (req.query["parentId"] as string | undefined) ?? null;

    if (!projectId) {
      res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "projectId query param is required" },
      });
      return;
    }

    const folders = await listFolders(req.tenantId!, projectId, parentId);
    res.json({ data: folders });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/files/folders/:folderId
 * Deletes a folder and all its descendants (subfolders + files).
 */
export async function deleteFolderById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const folderId = req.params["folderId"] as string;
    await deleteFolder(req.tenantId!, folderId, req.user!.id);
    logger.info({ tenantId: req.tenantId, folderId }, "Folder deleted");
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/files/folders
 */
export async function postFolder(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = createFolderSchema.parse(req.body);
    const folder = await createFolder(req.tenantId!, req.user!.id, input);
    logger.info({ tenantId: req.tenantId, folderId: folder.id }, "Folder created");
    res.status(201).json({ data: folder });
  } catch (err) {
    next(err);
  }
}
