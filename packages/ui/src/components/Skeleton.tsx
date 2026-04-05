import { cn } from "../lib/utils";

/**
 * Skeleton loader for content placeholders while data is loading.
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-neutral-100", className)}
      {...props}
    />
  );
}

export { Skeleton };
