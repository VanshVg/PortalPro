import { Router } from "express";
import {
  postPresignedUrl,
  postConfirmUpload,
  getFiles,
  deleteFileById,
  getFolders,
  postFolder,
  deleteFolderById,
} from "./files.controller";

const router = Router();

// File operations
router.post("/presigned-url", postPresignedUrl);
router.post("/confirm", postConfirmUpload);
router.get("/", getFiles);
router.delete("/:fileId", deleteFileById);

// Folder operations
router.get("/folders", getFolders);
router.post("/folders", postFolder);
router.delete("/folders/:folderId", deleteFolderById);

export { router as fileRoutes };
