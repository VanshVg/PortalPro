import { requireSession } from "@/lib/session";
import { prisma } from "@portalpro/database";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Avatar,
  AvatarFallback,
} from "@portalpro/ui";
import { Globe, FolderOpen, ChevronRight, Users } from "lucide-react";
import { InviteClientButton } from "@/components/clients/InviteClientButton";
import { ProjectStatusBadge } from "@portalpro/ui";

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props) {
  const portal = await prisma.clientPortal.findUnique({
    where: { id: params.id },
    select: { name: true },
  });
  return { title: `${portal?.name ?? "Client"} — PortalPro` };
}

export default async function ClientDetailPage({ params }: Props) {
  const user = await requireSession();
  if (!user.tenantId) notFound();

  const portal = await prisma.clientPortal.findUnique({
    where: { id: params.id },
    include: {
      access: {
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
        orderBy: { invitedAt: "asc" },
      },
      projects: {
        include: { _count: { select: { tasks: true } }, tasks: { select: { status: true } } },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!portal || portal.tenantId !== user.tenantId) notFound();

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-neutral-500">
        <Link href="/clients" className="hover:text-neutral-800 transition-colors">
          Clients
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-neutral-800 font-medium">{portal.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div
            className="h-14 w-14 rounded-xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0"
            style={{ backgroundColor: portal.primaryColor ?? "#1B4D6E" }}
          >
            {portal.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-neutral-800">{portal.name}</h1>
              <Badge variant={portal.isActive ? "success" : "default"}>
                {portal.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="flex items-center gap-1 mt-1 text-sm text-neutral-400">
              <Globe className="h-3.5 w-3.5" />
              <span>{portal.slug}</span>
              {portal.customDomain && (
                <>
                  <span className="mx-1">·</span>
                  <span>{portal.customDomain}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <InviteClientButton portalId={portal.id} userRole={user.role} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-neutral-400" />
              Projects ({portal.projects.length})
            </CardTitle>
            <Link
              href={`/projects?portal=${portal.id}`}
              className="text-xs text-[#1B4D6E] hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {portal.projects.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-neutral-400">
                No projects yet.{" "}
                <Link href="/projects/new" className="text-[#1B4D6E] hover:underline">
                  Create one
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {portal.projects.slice(0, 5).map((project) => {
                  const total = project._count.tasks;
                  const done = project.tasks.filter((t) => t.status === "DONE").length;
                  const progress = total === 0 ? 0 : Math.round((done / total) * 100);

                  return (
                    <div key={project.id} className="px-6 py-3 flex items-center justify-between">
                      <div>
                        <Link
                          href={`/projects/${project.id}`}
                          className="text-sm font-medium text-neutral-800 hover:text-[#1B4D6E] transition-colors"
                        >
                          {project.name}
                        </Link>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="h-1.5 w-24 rounded-full bg-neutral-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[#1B4D6E] transition-all"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-neutral-400">{progress}%</span>
                        </div>
                      </div>
                      <ProjectStatusBadge status={project.status as any} />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Access (client users) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-neutral-400" />
              Access ({portal.access.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {portal.access.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-neutral-400">
                No clients have been invited yet.
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {portal.access.map((a) => {
                  const initials = a.user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <div key={a.id} className="px-6 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="text-sm font-medium text-neutral-800">
                            {a.user.name}
                          </div>
                          <div className="text-xs text-neutral-400">{a.user.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!a.acceptedAt && (
                          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                            Pending
                          </span>
                        )}
                        <span className="text-xs text-neutral-400">{a.role}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
