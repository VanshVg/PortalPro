import { Skeleton } from "@portalpro/ui";

export default function SettingsLoading() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-9 w-40 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Tabs placeholder */}
      <div className="flex gap-2 mb-6">
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-24 rounded-full" />
      </div>

      {/* Card */}
      <Skeleton className="h-64 w-full max-w-2xl rounded-xl" />
    </div>
  );
}
