"use client";

import { Button } from "@portalpro/ui";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { useEffect } from "react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log to error reporting service in production
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-error/10">
        <AlertTriangle className="h-8 w-8 text-error" />
      </div>
      <h2 className="text-xl font-semibold text-neutral-800">Something went wrong</h2>
      <p className="mt-2 max-w-md text-sm text-neutral-500">
        An unexpected error occurred while loading this page.
        {error.digest && (
          <span className="mt-1 block font-mono text-xs text-neutral-400">
            Error ID: {error.digest}
          </span>
        )}
      </p>
      <div className="mt-6 flex gap-3">
        <Button onClick={reset} variant="outline">
          <RotateCcw className="mr-2 h-4 w-4" />
          Try again
        </Button>
        <Button onClick={() => (window.location.href = "/")}>Go to dashboard</Button>
      </div>
    </div>
  );
}
