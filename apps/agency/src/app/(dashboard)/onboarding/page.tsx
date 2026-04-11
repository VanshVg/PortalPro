import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@portalpro/database";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

/**
 * Onboarding page — shown once after signup.
 * Redirects to dashboard if the workspace already has portals or projects,
 * meaning the user has completed onboarding.
 */
export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.tenantId) redirect("/login");

  const tenantId = session.user.tenantId;

  // Check if tenant has already created at least one portal (onboarding complete)
  const portalCount = await prisma.clientPortal.count({ where: { tenantId } });
  if (portalCount > 0) redirect("/");

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true, primaryColor: true, secondaryColor: true, logo: true },
  });

  if (!tenant) redirect("/login");

  return <OnboardingWizard tenant={tenant} />;
}
