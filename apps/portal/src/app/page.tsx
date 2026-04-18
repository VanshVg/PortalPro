import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@portalpro/database";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@portalpro/ui";
import Image from "next/image";
import Link from "next/link";

export default async function PortalHomePage() {
  const session = await auth();

  if (session?.user) {
    // Find the first portal this user has access to and redirect them there
    const access = await prisma.clientPortalAccess.findFirst({
      where: { userId: session.user.id },
      include: {
        clientPortal: {
          select: {
            slug: true,
            isActive: true,
            tenant: { select: { slug: true } },
          },
        },
      },
      orderBy: { invitedAt: "desc" },
    });

    if (access && access.clientPortal.isActive) {
      redirect(`/${access.clientPortal.tenant.slug}/${access.clientPortal.slug}`);
    }
  }

  // Landing page for unauthenticated visitors
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-6">
        <Image src="/logo-full.png" alt="PortalPro" width={120} height={30} priority />
        <Link href="/login">
          <Button variant="ghost" size="sm">
            Sign In
          </Button>
        </Link>
      </header>

      {/* Hero */}
      <main className="flex flex-1 items-center justify-center p-6">
        <Card className="max-w-lg text-center">
          <CardHeader>
            <CardTitle className="text-2xl">Welcome to Your Portal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-neutral-500">
              Track your project progress, review deliverables, and communicate with your agency — all in one place.
            </p>
            <Link href="/login">
              <Button size="lg">Sign In to Continue</Button>
            </Link>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
