import { Suspense } from "react";
import { prisma } from "@portalpro/database";
import { auth } from "@/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, File, FileImage, FileText, Download, FolderOpen } from "lucide-react";
import { Card, CardContent, Skeleton } from "@portalpro/ui";
import { generateDownloadUrl } from "@/lib/r2";
import { formatBytes } from "@portalpro/utils";

interface Props {
  params: { tenantSlug: string; portalSlug: string; projectId: string };
}

export async function generateMetadata({ params }: Props) {
  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
    select: { name: true },
  });
  return { title: `Files — ${project?.name ?? "Project"} — Portal` };
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return FileImage;
  if (mimeType.includes("pdf") || mimeType.startsWith("text/")) return FileText;
  return File;
}

function getFileIconColor(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "text-purple-500";
  if (mimeType.includes("pdf")) return "text-red-500";
  if (mimeType.startsWith("text/")) return "text-blue-500";
  return "text-neutral-400";
}

export default async function PortalProjectFilesPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) notFound();

  const portalBase = `/${params.tenantSlug}/${params.portalSlug}`;
  const projectBase = `${portalBase}/projects/${params.projectId}`;

  return (
    <div className="space-y-6">
      <div>
        <Suspense
          fallback={
            <span className="inline-flex items-center gap-1.5 text-sm text-neutral-500 mb-4">
              <ArrowLeft className="h-4 w-4" />
              <Skeleton className="h-4 w-32 inline-block" />
            </span>
          }
        >
          <BackLink projectId={params.projectId} projectBase={projectBase} />
        </Suspense>
        <h1 className="text-2xl font-bold text-neutral-800">Files</h1>
      </div>

      <Suspense fallback={<FilesListSkeleton />}>
        <FilesList params={params} />
      </Suspense>
    </div>
  );
}

async function BackLink({
  projectId,
  projectBase,
}: {
  projectId: string;
  projectBase: string;
}) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { name: true },
  });
  return (
    <Link
      href={projectBase}
      className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 transition-colors mb-4"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to {project?.name ?? "project"}
    </Link>
  );
}

async function FilesList({
  params,
}: {
  params: { tenantSlug: string; portalSlug: string; projectId: string };
}) {
  const [portal, project] = await Promise.all([
    prisma.clientPortal.findFirst({
      where: { slug: params.portalSlug, tenant: { slug: params.tenantSlug } },
      select: { id: true },
    }),
    prisma.project.findUnique({
      where: { id: params.projectId },
      select: { id: true, name: true, clientPortalId: true },
    }),
  ]);

  if (!portal || !project || project.clientPortalId !== portal.id) notFound();

  const files = await prisma.file.findMany({
    where: { projectId: params.projectId, parentId: null },
    orderBy: { createdAt: "desc" },
  });

  // Generate presigned download URLs in parallel
  const filesWithUrls = await Promise.all(
    files.map(async (file) => ({
      id: file.id,
      name: file.name,
      key: file.key,
      size: file.size,
      mimeType: file.mimeType,
      version: file.version,
      createdAt: file.createdAt.toISOString(),
      downloadUrl: await generateDownloadUrl(file.key).catch(() => null),
    })),
  );

  return (
    <>
      <p className="text-sm text-neutral-500 -mt-4">
        {filesWithUrls.length} file{filesWithUrls.length !== 1 ? "s" : ""} shared in this project
      </p>

      {filesWithUrls.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FolderOpen className="h-10 w-10 text-neutral-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-neutral-600">No files yet</p>
            <p className="text-xs text-neutral-400 mt-1">
              Your agency will share files here as the project progresses.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
          <div className="border-b border-neutral-100 bg-neutral-50 px-4 py-2.5">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
              Project Files
            </p>
          </div>
          <div className="divide-y divide-neutral-100">
            {filesWithUrls.map((file) => {
              const Icon = getFileIcon(file.mimeType);
              const iconColor = getFileIconColor(file.mimeType);

              return (
                <div
                  key={file.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 transition-colors"
                >
                  <div className="h-9 w-9 rounded-lg border border-neutral-100 bg-neutral-50 flex items-center justify-center flex-shrink-0">
                    <Icon className={`h-4 w-4 ${iconColor}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-800 truncate">{file.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-neutral-400">{formatBytes(file.size)}</span>
                      {file.version > 1 && (
                        <span className="text-xs text-neutral-400">· v{file.version}</span>
                      )}
                      <span className="text-xs text-neutral-400">
                        ·{" "}
                        {new Date(file.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>

                  {file.downloadUrl && (
                    <a
                      href={file.downloadUrl}
                      download={file.name}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 hover:border-neutral-300 transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

function FilesListSkeleton() {
  return (
    <>
      <Skeleton className="h-4 w-40 -mt-4" />
      <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
        <div className="border-b border-neutral-100 bg-neutral-50 px-4 py-2.5">
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="divide-y divide-neutral-100">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="h-9 w-9 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
