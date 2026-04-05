import { Skeleton } from "@portalpro/ui";

export default function PortalDashboardLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-neutral-200 bg-white p-5">
            <Skeleton className="h-4 w-24 mb-3" />
            <Skeleton className="h-7 w-12" />
          </div>
        ))}
      </div>

      <div>
        <Skeleton className="h-6 w-36 mb-4" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
              <div className="flex items-start justify-between">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
              <Skeleton className="h-3 w-28" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
