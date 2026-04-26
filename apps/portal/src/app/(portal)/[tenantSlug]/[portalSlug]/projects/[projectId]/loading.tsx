import { Skeleton } from "@portalpro/ui";

export default function PortalProjectLoading() {
  return (
    <div className="space-y-8">
      {/* Back + header */}
      <div>
        <Skeleton className="h-4 w-32 mb-4" />
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>

      {/* Progress card */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-12" />
        </div>
        <Skeleton className="h-3 w-full rounded-full" />
        <Skeleton className="h-3 w-40" />
      </div>

      {/* Milestone timeline */}
      <div>
        <Skeleton className="h-6 w-28 mb-4" />
        <Skeleton className="h-1.5 w-full rounded-full mb-4" />
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-5 w-40" />
                </div>
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-1 w-full rounded-full" />
              <div className="space-y-2 pt-2">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="flex items-center gap-3 py-1">
                    <Skeleton className="h-3.5 w-3.5 rounded-full flex-shrink-0" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
