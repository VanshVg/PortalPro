import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { prisma } from "@portalpro/database";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = {
    name: session.user.name ?? "Unknown",
    email: session.user.email ?? "",
    role: session.user.role ?? null,
    image: session.user.image ?? null,
  };

  // Only count messages from OTHER users — own sent messages are never "unread" for you.
  const unreadMessages = session.user.tenantId
    ? await prisma.message.count({
        where: {
          project: { tenantId: session.user.tenantId },
          threadId: null,
          isRead: false,
          authorId: { not: session.user.id },
        },
      })
    : 0;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={user} unreadMessages={unreadMessages} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={user} />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
