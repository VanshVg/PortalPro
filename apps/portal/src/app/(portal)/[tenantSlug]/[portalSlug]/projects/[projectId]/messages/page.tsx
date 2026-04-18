import { prisma } from "@portalpro/database";
import { auth } from "@/auth";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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

  // Verify portal access
  const portal = await prisma.clientPortal.findFirst({
    where: {
      slug: params.portalSlug,
      tenant: { slug: params.tenantSlug },
    },
    select: { id: true },
  });
  if (!portal) notFound();

  const project = await prisma.project.findUnique({
    where: { id: params.projectId },
    select: { id: true, name: true, clientPortalId: true },
  });
  if (!project || project.clientPortalId !== portal.id) notFound();

  const portalBase = `/${params.tenantSlug}/${params.portalSlug}`;
  const projectBase = `${portalBase}/projects/${params.projectId}`;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={projectBase}
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {project.name}
        </Link>
        <h1 className="text-2xl font-bold text-neutral-800">Messages</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Project conversation for {project.name}
        </p>
      </div>

      <PortalMessagingPanel
        projectId={project.id}
        currentUserId={session.user.id}
        currentUserName={session.user.name}
      />
    </div>
  );
}
