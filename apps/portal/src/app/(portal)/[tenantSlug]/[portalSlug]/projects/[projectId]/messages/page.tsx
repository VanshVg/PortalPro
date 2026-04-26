import { Suspense } from "react";
import { prisma } from "@portalpro/database";
import { auth } from "@/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "@portalpro/ui";
import { PortalMessagingPanel } from "@/components/PortalMessagingPanel";

interface Props {
  params: { tenantSlug: string; portalSlug: string; projectId: string };
}

export async function generateMetadata({ params }: Props) {
  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
    select: { name: true },
  });
  return { title: `Messages — ${project?.name ?? "Project"} — Portal` };
}

export default async function PortalProjectMessagesPage({ params }: Props) {
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
        <h1 className="text-2xl font-bold text-neutral-800">Messages</h1>
      </div>

      <Suspense fallback={<MessagingPanelSkeleton />}>
        <MessagingPanelLoader
          params={params}
          userId={session.user.id}
          userName={session.user.name}
        />
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

async function MessagingPanelLoader({
  params,
  userId,
  userName,
}: {
  params: { tenantSlug: string; portalSlug: string; projectId: string };
  userId: string;
  userName: string;
}) {
  const portal = await prisma.clientPortal.findFirst({
    where: { slug: params.portalSlug, tenant: { slug: params.tenantSlug } },
    select: { id: true },
  });
  if (!portal) notFound();

  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
    select: { id: true, name: true, clientPortalId: true },
  });
  if (!project || project.clientPortalId !== portal.id) notFound();

  return (
    <>
      <p className="text-sm text-neutral-500 -mt-4">
        Project conversation for {project.name}
      </p>
      <PortalMessagingPanel
        projectId={project.id}
        currentUserId={userId}
        currentUserName={userName}
      />
    </>
  );
}

function MessagingPanelSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-56" />
      <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>
      <Skeleton className="h-20 w-full rounded-xl" />
    </div>
  );
}
