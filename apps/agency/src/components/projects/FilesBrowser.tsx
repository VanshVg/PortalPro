"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Input,
} from "@portalpro/ui";
import { useToast } from "@portalpro/ui";
import {
  Upload,
  File,
  FileImage,
  FileText,
  Trash2,
  Download,
  FolderOpen,
  FolderPlus,
} from "lucide-react";
import { formatBytes } from "@portalpro/utils";
import { API_URL } from "@/lib/env";
import { canWrite } from "@/lib/rbac";

interface FileItem {
  id: string;
  name: string;
  key: string;
  size: number;
  mimeType: string;
  version: number;
  downloadUrl?: string;
  createdAt: string;
}

interface FolderItem {
  id: string;
  name: string;
  parentId: string | null;
}

/** What the pending-delete confirmation dialog targets */
interface DeleteTarget {
  type: "file" | "folder";
  id: string;
  name: string;
}

interface Props {
  projectId: string;
  userRole?: string | null;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return FileImage;
  if (mimeType.includes("pdf") || mimeType.startsWith("text/")) return FileText;
  return File;
}

/**
 * File browser with drag-and-drop upload, folder navigation, and delete.
 * Upload, delete, and folder creation are hidden for VIEWER role.
 */
export function FilesBrowser({ projectId, userRole }: Props) {
  const hasWriteAccess = canWrite(userRole);
  const { toast } = useToast();

  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderStack, setFolderStack] = useState<FolderItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New folder dialog
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // Shared delete confirmation dialog
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchContents = useCallback(async (folderId: string | null) => {
    // Clear stale data immediately so the skeleton never shows over old content
    setFiles([]);
    setFolders([]);
    setIsLoading(true);
    try {
      // Files use `folderId`; folders API uses `parentId` — keep params separate
      const fileParams = new URLSearchParams({ projectId });
      if (folderId) fileParams.set("folderId", folderId);

      const folderParams = new URLSearchParams({ projectId });
      if (folderId) folderParams.set("parentId", folderId);

      const [filesRes, foldersRes] = await Promise.all([
        fetch(`${API_URL}/api/v1/files?${fileParams}`, { credentials: "include" }),
        fetch(`${API_URL}/api/v1/files/folders?${folderParams}`, { credentials: "include" }),
      ]);

      if (filesRes.ok) {
        const body = (await filesRes.json()) as { data: FileItem[] };
        setFiles(body.data);
      }
      if (foldersRes.ok) {
        const body = (await foldersRes.json()) as { data: FolderItem[] };
        setFolders(body.data);
      }
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchContents(currentFolderId);
  }, [currentFolderId, fetchContents]);

  // ─── Upload ───────────────────────────────────────────────────────────────

  async function uploadFile(file: File) {
    const fileName = file.name;

    const urlRes = await fetch(`${API_URL}/api/v1/files/presigned-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        fileName,
        mimeType: file.type,
        fileSize: file.size,
        projectId,
        folderId: currentFolderId,
      }),
    });

    if (!urlRes.ok) {
      const body = (await urlRes.json()) as { error?: { message?: string } };
      throw new Error(body.error?.message ?? "Failed to get upload URL");
    }

    const { data } = (await urlRes.json()) as { data: { uploadUrl: string; key: string } };

    setUploading((prev) => ({ ...prev, [fileName]: 0 }));
    const uploadRes = await fetch(data.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type, "Content-Length": file.size.toString() },
      body: file,
    });

    if (!uploadRes.ok) throw new Error("Upload to storage failed");
    setUploading((prev) => ({ ...prev, [fileName]: 100 }));

    const confirmRes = await fetch(`${API_URL}/api/v1/files/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        name: fileName,
        key: data.key,
        size: file.size,
        mimeType: file.type,
        projectId,
        folderId: currentFolderId,
      }),
    });

    if (!confirmRes.ok) throw new Error("Failed to confirm upload");

    const { data: fileData } = (await confirmRes.json()) as { data: FileItem };
    setFiles((prev) => {
      const exists = prev.findIndex((f) => f.name === fileName);
      if (exists >= 0) {
        const copy = [...prev];
        copy[exists] = fileData;
        return copy;
      }
      return [fileData, ...prev];
    });
  }

  async function handleFiles(fileList: FileList | File[]) {
    for (const file of Array.from(fileList)) {
      try {
        await uploadFile(file);
        toast({ title: "Uploaded", description: file.name });
      } catch (err: unknown) {
        toast({
          title: "Upload failed",
          description: err instanceof Error ? err.message : file.name,
          variant: "error",
        });
      } finally {
        setUploading((prev) => {
          const copy = { ...prev };
          delete copy[file.name];
          return copy;
        });
      }
    }
  }

  // ─── Delete (file or folder) ──────────────────────────────────────────────

  async function confirmDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const url =
        deleteTarget.type === "folder"
          ? `${API_URL}/api/v1/files/folders/${deleteTarget.id}`
          : `${API_URL}/api/v1/files/${deleteTarget.id}`;

      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Delete failed");

      if (deleteTarget.type === "folder") {
        setFolders((prev) => prev.filter((f) => f.id !== deleteTarget.id));
        toast({ title: "Folder deleted", description: deleteTarget.name });
      } else {
        setFiles((prev) => prev.filter((f) => f.id !== deleteTarget.id));
        toast({ title: "File deleted", description: deleteTarget.name });
      }
      setDeleteTarget(null);
    } catch {
      toast({ title: "Error", description: "Failed to delete. Please try again.", variant: "error" });
    } finally {
      setIsDeleting(false);
    }
  }

  // ─── Create folder ────────────────────────────────────────────────────────

  async function handleCreateFolder() {
    const name = folderName.trim();
    if (!name) return;

    setIsCreatingFolder(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/files/folders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, projectId, parentId: currentFolderId }),
      });
      if (!res.ok) throw new Error("Failed to create folder");
      const body = (await res.json()) as { data: FolderItem };
      setFolders((prev) => [...prev, body.data]);
      setFolderDialogOpen(false);
      setFolderName("");
      toast({ title: "Folder created", description: name });
    } catch {
      toast({ title: "Error", description: "Failed to create folder.", variant: "error" });
    } finally {
      setIsCreatingFolder(false);
    }
  }

  function navigateInto(folder: FolderItem) {
    setFolderStack((prev) => [...prev, folder]);
    setCurrentFolderId(folder.id);
  }

  const isEmpty = folders.length === 0 && files.length === 0 && !isLoading;
  const uploadingCount = Object.keys(uploading).length;

  return (
    <>
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-sm">
            <button
              onClick={() => { setFolderStack([]); setCurrentFolderId(null); }}
              className="text-[#1B4D6E] hover:underline"
            >
              Files
            </button>
            {folderStack.map((f, i) => (
              <span key={f.id} className="flex items-center gap-1">
                <span className="text-neutral-400">/</span>
                <button
                  onClick={() => {
                    const newStack = folderStack.slice(0, i + 1);
                    setFolderStack(newStack);
                    setCurrentFolderId(f.id);
                  }}
                  className="text-[#1B4D6E] hover:underline"
                >
                  {f.name}
                </button>
              </span>
            ))}
          </div>

          {hasWriteAccess && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setFolderName(""); setFolderDialogOpen(true); }}
              >
                <FolderPlus className="mr-1.5 h-3.5 w-3.5" />
                New folder
              </Button>
              <Button size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                Upload files
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
              />
            </div>
          )}
        </div>

        {/* Drop zone */}
        <div
          onDragOver={hasWriteAccess ? (e) => { e.preventDefault(); setIsDragging(true); } : undefined}
          onDragLeave={hasWriteAccess ? () => setIsDragging(false) : undefined}
          onDrop={hasWriteAccess ? (e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
          } : undefined}
          className={[
            "rounded-xl border-2 border-dashed transition-colors min-h-[200px]",
            isDragging
              ? "border-[#1B4D6E] bg-[#1B4D6E]/5"
              : "border-neutral-200 hover:border-neutral-300",
          ].join(" ")}
        >
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 py-2 px-2 animate-pulse">
                  <div className="h-4 w-4 rounded bg-neutral-200 flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-48 rounded bg-neutral-200" />
                    <div className="h-2.5 w-24 rounded bg-neutral-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : isEmpty && uploadingCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
              <Upload className="h-10 w-10 mb-3 text-neutral-300" />
              {hasWriteAccess ? (
                <>
                  <p className="text-sm font-medium">Drop files here or click Upload</p>
                  <p className="text-xs mt-1">Supports any file type up to 100 MB</p>
                </>
              ) : (
                <p className="text-sm font-medium">No files uploaded yet</p>
              )}
            </div>
          ) : (
            <div className="p-4">
              {/* In-progress uploads */}
              {Object.entries(uploading).map(([name, pct]) => (
                <div key={name} className="flex items-center gap-3 py-2 px-2">
                  <File className="h-4 w-4 text-neutral-300 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-neutral-600 truncate">{name}</div>
                    <div className="mt-1 h-1 w-full rounded-full bg-neutral-100 overflow-hidden">
                      <div className="h-full bg-[#1B4D6E] transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <span className="text-xs text-neutral-400 flex-shrink-0">Uploading…</span>
                </div>
              ))}

              {/* Folders */}
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  onClick={() => navigateInto(folder)}
                  className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-neutral-50 cursor-pointer group"
                >
                  <FolderOpen className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  <span className="flex-1 text-sm text-neutral-800">{folder.name}</span>
                  {hasWriteAccess && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // don't navigate into the folder
                        setDeleteTarget({ type: "folder", id: folder.id, name: folder.name });
                      }}
                      className="rounded p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete folder"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}

              {/* Files */}
              {files.map((file) => {
                const Icon = getFileIcon(file.mimeType);
                return (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-neutral-50 group"
                  >
                    <Icon className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-neutral-800 truncate">{file.name}</div>
                      <div className="text-xs text-neutral-400">
                        {formatBytes(file.size)}
                        {file.version > 1 && ` · v${file.version}`}
                        {" · "}
                        {new Date(file.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {file.downloadUrl && (
                        <a
                          href={file.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                          title="Download"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {hasWriteAccess && (
                        <button
                          onClick={() => setDeleteTarget({ type: "file", id: file.id, name: file.name })}
                          className="rounded p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                          title="Delete file"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* New Folder Dialog */}
      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
          </DialogHeader>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Folder name
            </label>
            <Input
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="e.g. Design Assets"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleCreateFolder(); }}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setFolderDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateFolder}
              disabled={!folderName.trim() || isCreatingFolder}
            >
              {isCreatingFolder ? "Creating…" : "Create folder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Delete {deleteTarget?.type === "folder" ? "folder" : "file"}?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-neutral-600">
            {deleteTarget?.type === "folder" ? (
              <>
                <span className="font-medium">{deleteTarget.name}</span> and all its contents
                (subfolders and files) will be permanently deleted. This cannot be undone.
              </>
            ) : (
              <>
                <span className="font-medium">{deleteTarget?.name}</span> will be permanently
                deleted. This cannot be undone.
              </>
            )}
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
