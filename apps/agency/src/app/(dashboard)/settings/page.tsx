import { Suspense } from "react";
import { requireSession } from "@/lib/session";
import { prisma } from "@portalpro/database";
import { notFound } from "next/navigation";
import { SettingsTabs } from "@/components/settings/SettingsTabs";
import { Skeleton } from "@portalpro/ui";

export const metadata = { title: "Settings — PortalPro" };

export default async function SettingsPage() {
  const user = await requireSession();
  if (!user.tenantId) notFound();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-neutral-800">Settings</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Manage your workspace, branding, and team.
        </p>
      </div>

      <Suspense fallback={<SettingsTabsSkeleton />}>
        <SettingsContent tenantId={user.tenantId} userId={user.id} userRole={user.role ?? "VIEWER"} />
      </Suspense>
    </div>
  );
}

async function SettingsContent({
  tenantId,
  userId,
  userRole,
}: {
  tenantId: string;
  userId: string;
  userRole: string;
}) {
  const [tenant, members] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        primaryColor: true,
        secondaryColor: true,
        customDomain: true,
        logo: true,
        plan: true,
      },
    }),
    prisma.tenantMember.findMany({
      where: { tenantId },
      include: {
        user: {
          select: { id: true, email: true, name: true, avatarUrl: true },
        },
      },
      orderBy: { user: { name: "asc" } },
    }),
  ]);

  if (!tenant) notFound();

  return (
    <SettingsTabs
      tenant={tenant}
      members={members.map((m) => ({
        id: m.id,
        role: m.role,
        user: m.user,
      }))}
      currentUserId={userId}
      currentUserRole={userRole}
    />
  );
}

function SettingsTabsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Tab row */}
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-full" />
      </div>

      {/* Form card */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 max-w-2xl space-y-5">
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>
    </div>
  );
}
