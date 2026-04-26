import { Suspense } from "react";
import { requireSession } from "@/lib/session";
import { prisma } from "@portalpro/database";
import Link from "next/link";
import { Card, CardContent, EmptyState, Badge, Skeleton } from "@portalpro/ui";
import { Globe, Users, FolderOpen } from "lucide-react";
import { CreatePortalButton } from "@/components/clients/CreatePortalButton";

export const metadata = { title: "Clients — PortalPro" };

export default async function ClientsPage() {
  const user = await requireSession();
  if (!user.tenantId) return null;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-800">Clients</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Manage client portals and access.
          </p>
        </div>
        <CreatePortalButton userRole={user.role} />
      </div>

      <Suspense fallback={<ClientsListSkeleton />}>
        <ClientsList tenantId={user.tenantId} userRole={user.role} />
      </Suspense>
    </div>
  );
}

async function ClientsList({
  tenantId,
  userRole,
}: {
  tenantId: string;
  userRole: string | null;
}) {
  const portals = await prisma.clientPortal.findMany({
    where: { tenantId },
    include: {
      _count: { select: { projects: true, access: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (portals.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No client portals yet"
        description="Create a portal for each client to share projects, files, and updates."
        action={<CreatePortalButton variant="outline" userRole={userRole} />}
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {portals.map((portal) => (
        <Link key={portal.id} href={`/clients/${portal.id}`} className="group">
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div
                  className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ backgroundColor: portal.primaryColor ?? "#1B4D6E" }}
                >
                  {portal.name.charAt(0).toUpperCase()}
                </div>
                <Badge
                  variant={portal.isActive ? "success" : "default"}
                  className="text-xs"
                >
                  {portal.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>

              <div className="mb-4">
                <h3 className="font-semibold text-neutral-800 group-hover:text-[#1B4D6E] transition-colors">
                  {portal.name}
                </h3>
                <div className="flex items-center gap-1 mt-0.5 text-xs text-neutral-400">
                  <Globe className="h-3 w-3" />
                  <span>{portal.slug}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-neutral-500">
                <div className="flex items-center gap-1">
                  <FolderOpen className="h-3.5 w-3.5" />
                  <span>{portal._count.projects} project{portal._count.projects !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  <span>{portal._count.access} user{portal._count.access !== 1 ? "s" : ""}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

function ClientsListSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-neutral-200 bg-white p-6 space-y-4">
          <div className="flex items-start justify-between">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="flex gap-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}
