import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@portalpro/database";

export const dynamic = "force-dynamic";

/**
 * Returns the count of unread top-level messages across the current user's
 * tenant, excluding messages they authored. Used by the sidebar badge so that
 * the dashboard layout doesn't have to await this query on every navigation.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !session.user.tenantId) {
    return NextResponse.json({ count: 0 });
  }

  const count = await prisma.message.count({
    where: {
      project: { tenantId: session.user.tenantId },
      threadId: null,
      isRead: false,
      authorId: { not: session.user.id },
    },
  });

  return NextResponse.json({ count });
}
