import { Card, CardContent, CardHeader, CardTitle } from "@portalpro/ui";
import {
  FolderOpen,
  MessageSquare,
  FileCheck,
  DollarSign,
} from "lucide-react";

const stats = [
  {
    title: "Active Projects",
    value: "12",
    change: "+3 this week",
    icon: FolderOpen,
    trend: "up" as const,
  },
  {
    title: "Pending Approvals",
    value: "5",
    change: "2 new today",
    icon: FileCheck,
    trend: "up" as const,
  },
  {
    title: "Unread Messages",
    value: "8",
    change: "from 3 clients",
    icon: MessageSquare,
    trend: "neutral" as const,
  },
  {
    title: "Revenue This Month",
    value: "\u00a312,450",
    change: "+15% vs last month",
    icon: DollarSign,
    trend: "up" as const,
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-neutral-800">Dashboard</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Welcome back. Here is your agency overview.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-neutral-500">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-5 w-5 text-neutral-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-neutral-800">
                {stat.value}
              </div>
              <p className="mt-1 text-xs text-neutral-500">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-500">
            Activity feed will be populated once projects are created.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
