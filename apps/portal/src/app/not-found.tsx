import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 text-center px-4">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
        <FileQuestion className="h-8 w-8 text-neutral-400" />
      </div>
      <h1 className="text-2xl font-bold text-neutral-800">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-neutral-500">
        The page you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.
      </p>
      <Link
        href="/login"
        className="mt-6 inline-flex items-center rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: "#1B4D6E" }}
      >
        Return to login
      </Link>
    </div>
  );
}
