import { Skeleton } from "@portalpro/ui";

export default function PortalMessagesLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-4 w-40 mb-4" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-64 mt-1" />
      </div>

      {/* Message list skeleton */}
      <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
        <div className="divide-y divide-neutral-100">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3 p-4">
              <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          ))}
        </div>

        {/* Reply box skeleton */}
        <div className="border-t border-neutral-200 p-4 space-y-3">
          <Skeleton className="h-20 w-full rounded-lg" />
          <div className="flex justify-end">
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
