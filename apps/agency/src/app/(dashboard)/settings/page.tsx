import { requireSession } from "@/lib/session";
import { prisma } from "@portalpro/database";
import { notFound } from "next/navigation";
import { SettingsTabs } from "@/components/settings/SettingsTabs";

export const metadata = { title: "Settings — PortalPro" };

export default async function SettingsPage() {
  const user = await requireSession();
  if (!user.tenantId) notFound();

  const [tenant, members] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: user.tenantId },
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
      where: { tenantId: user.tenantId },
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
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-neutral-800">Settings</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Manage your workspace, branding, and team.
        </p>
      </div>

      <SettingsTabs
        tenant={tenant}
        members={members.map((m) => ({
          id: m.id,
          role: m.role,
          user: m.user,
        }))}
        currentUserId={user.id}
        currentUserRole={user.role ?? "VIEWER"}
      />
    </div>
  );
}
