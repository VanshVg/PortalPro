import { requireSession } from "@/lib/session";
import { prisma } from "@portalpro/database";
import Link from "next/link";
import { Card, CardContent, EmptyState, Badge } from "@portalpro/ui";
import { Globe, Users, FolderOpen } from "lucide-react";
import { CreatePortalButton } from "@/components/clients/CreatePortalButton";

export const metadata = { title: "Clients — PortalPro" };

export default async function ClientsPage() {
  const user = await requireSession();
  if (!user.tenantId) return null;

  const portals = await prisma.clientPortal.findMany({
    where: { tenantId: user.tenantId },
    include: {
      _count: { select: { projects: true, access: true } },
    },
    orderBy: { createdAt: "desc" },
  });

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

      {portals.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No client portals yet"
          description="Create a portal for each client to share projects, files, and updates."
          action={<CreatePortalButton variant="outline" userRole={user.role} />}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {portals.map((portal) => (
            <Link key={portal.id} href={`/clients/${portal.id}`} className="group">
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="p-6">
                  {/* Header */}
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

                  {/* Name + slug */}
                  <div className="mb-4">
                    <h3 className="font-semibold text-neutral-800 group-hover:text-[#1B4D6E] transition-colors">
                      {portal.name}
                    </h3>
                    <div className="flex items-center gap-1 mt-0.5 text-xs text-neutral-400">
                      <Globe className="h-3 w-3" />
                      <span>{portal.slug}</span>
                    </div>
                  </div>

                  {/* Stats */}
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
      )}
    </div>
  );
}
