import { requireSession } from "@/lib/session";
import { prisma } from "@portalpro/database";
import Link from "next/link";
import { Card, CardContent } from "@portalpro/ui";
import { MessageSquare, ExternalLink, Reply } from "lucide-react";
import { notFound } from "next/navigation";

export const metadata = { title: "Messages — PortalPro" };

export default async function MessagesPage() {
  const user = await requireSession();
  if (!user.tenantId) notFound();

  // Fetch recent top-level messages across all tenant projects, newest first
  const recentMessages = await prisma.message.findMany({
    where: {
      project: { tenantId: user.tenantId },
      threadId: null, // top-level only
    },
    include: {
      author: { select: { id: true, name: true, avatarUrl: true } },
      project: { select: { id: true, name: true } },
      _count: { select: { replies: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // Group messages by project
  const byProject = new Map<string, typeof recentMessages>();
  for (const msg of recentMessages) {
    const key = msg.project.id;
    if (!byProject.has(key)) byProject.set(key, []);
    byProject.get(key)!.push(msg);
  }

  const totalUnread = recentMessages.filter((m) => !m.isRead).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800">Messages</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Recent project conversations across your workspace
          </p>
        </div>
        {totalUnread > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-neutral-900">
            {totalUnread} unread
          </span>
        )}
      </div>

      {recentMessages.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 py-20 text-center">
          <MessageSquare className="mx-auto mb-3 h-10 w-10 text-neutral-300" />
          <p className="text-sm font-medium text-neutral-600">No messages yet</p>
          <p className="mt-1 text-xs text-neutral-400">
            Open a project and start a conversation from the Messages tab.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(byProject.entries()).map(([projectId, messages]) => {
            const projectName = messages[0]!.project.name;
            const unreadCount = messages.filter((m) => !m.isRead).length;

            return (
              <div key={projectId}>
                {/* Project heading */}
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-neutral-700">{projectName}</h2>
                    {unreadCount > 0 && (
                      <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-neutral-900">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  <Link
                    href={`/projects/${projectId}?tab=messages`}
                    className="flex items-center gap-1 text-xs text-[#2E86AB] hover:text-[#1B4D6E] transition-colors font-medium"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open thread
                  </Link>
                </div>

                <Card>
                  <CardContent className="p-0">
                    <div className="divide-y divide-neutral-50">
                      {messages.map((msg) => {
                        const initials = msg.author.name
                          .split(" ")
                          .map((w) => w[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase();
                        const time = new Date(msg.createdAt).toLocaleString("en-GB", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        });

                        return (
                          <div
                            key={msg.id}
                            className={[
                              "flex items-start gap-3 px-4 py-3",
                              !msg.isRead ? "bg-blue-50/40" : "",
                            ].join(" ")}
                          >
                            {/* Avatar */}
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1B4D6E] text-[11px] font-bold text-white">
                              {initials}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-2 mb-0.5">
                                <span className="text-xs font-semibold text-neutral-800">
                                  {msg.author.name}
                                </span>
                                <span className="text-[10px] text-neutral-400">{time}</span>
                                {!msg.isRead && (
                                  <span className="ml-auto flex-shrink-0 h-1.5 w-1.5 rounded-full bg-[#2E86AB]" />
                                )}
                              </div>
                              <p className="text-sm text-neutral-600 line-clamp-2 leading-relaxed">
                                {msg.content}
                              </p>
                              {msg._count.replies > 0 && (
                                <div className="mt-1 flex items-center gap-1 text-[10px] text-neutral-400">
                                  <Reply className="h-3 w-3" />
                                  {msg._count.replies}{" "}
                                  {msg._count.replies === 1 ? "reply" : "replies"}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
