import { prisma } from "@portalpro/database";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { PortalHeader } from "@/components/layout/PortalHeader";

interface PortalLayoutProps {
  children: React.ReactNode;
  params: { tenantSlug: string; portalSlug: string };
}

/**
 * Resolves the ClientPortal from URL slugs, applies white-label CSS variables,
 * and renders the portal chrome (branded header + main content area).
 */
export default async function PortalLayout({ children, params }: PortalLayoutProps) {
  const session = await auth();
  if (!session?.user) {
    redirect(`/login`);
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug: params.tenantSlug },
    select: { id: true, name: true },
  });
  if (!tenant) notFound();

  const portal = await prisma.clientPortal.findFirst({
    where: { tenantId: tenant.id, slug: params.portalSlug, isActive: true },
    select: {
      id: true,
      name: true,
      logo: true,
      primaryColor: true,
    },
  });
  if (!portal) notFound();

  // Verify client user has access to this portal
  const access = await prisma.clientPortalAccess.findUnique({
    where: {
      clientPortalId_userId: {
        clientPortalId: portal.id,
        userId: session.user.id,
      },
    },
  });
  if (!access) {
    redirect("/login");
  }

  const primaryColor = portal.primaryColor ?? "#1B4D6E";

  return (
    <div
      style={
        {
          "--portal-primary": primaryColor,
          "--portal-primary-light": `${primaryColor}26`, // 15% opacity
        } as React.CSSProperties
      }
    >
      <PortalHeader
        portalName={portal.name}
        tenantName={tenant.name}
        tenantSlug={params.tenantSlug}
        portalSlug={params.portalSlug}
        logoUrl={portal.logo}
        user={session.user}
      />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
