import { Skeleton } from "@portalpro/ui";

export default function PortalFilesLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-4 w-40 mb-4" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-4 w-48 mt-1" />
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
        <div className="border-b border-neutral-100 bg-neutral-50 px-4 py-3">
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="divide-y divide-neutral-100">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="h-9 w-9 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
