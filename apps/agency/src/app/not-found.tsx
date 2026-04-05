import { Button } from "@portalpro/ui";
import { FileSearch } from "lucide-react";
import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 p-6 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary-50">
        <FileSearch className="h-10 w-10 text-primary" />
      </div>
      <h1 className="text-4xl font-bold text-neutral-800">404</h1>
      <h2 className="mt-2 text-xl font-semibold text-neutral-700">Page not found</h2>
      <p className="mt-2 max-w-sm text-sm text-neutral-500">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Button className="mt-8" asChild>
        <Link href="/">Return to dashboard</Link>
      </Button>
    </div>
  );
}
