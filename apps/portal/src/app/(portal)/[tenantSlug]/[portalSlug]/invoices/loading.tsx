import { Skeleton } from "@portalpro/ui";

export default function InvoicesLoading() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-4 w-32 mb-4" />
        <Skeleton className="h-8 w-24" />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-neutral-200 bg-white p-5 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-20" />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-8 w-32" />
            <div className="flex gap-4">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
