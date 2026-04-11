"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Input } from "@portalpro/ui";
import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export default function PortalLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const successMessage = searchParams.get("message");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    const callbackUrl = searchParams.get("callbackUrl") ?? "/";

    startTransition(async () => {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password. Please try again.");
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    });
  }

  return (
    <Card className="shadow-modal border-neutral-700 bg-neutral-800">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4">
          <Image src="/logo-icon.png" alt="Portal" width={48} height={48} priority />
        </div>
        <CardTitle className="text-2xl text-white">Sign in to your portal</CardTitle>
        <CardDescription className="text-neutral-400">
          Enter your credentials to access your project portal
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-neutral-300">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@company.com"
              required
              autoComplete="email"
              className="border-neutral-600 bg-neutral-700 text-white placeholder:text-neutral-500 focus:ring-primary"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-neutral-300">
              Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              className="border-neutral-600 bg-neutral-700 text-white placeholder:text-neutral-500 focus:ring-primary"
            />
          </div>

          {successMessage && (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{successMessage}</p>
          )}

          {error && (
            <p className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</p>
          )}

          <Button className="w-full" size="lg" type="submit" disabled={isPending}>
            {isPending ? "Signing in…" : "Sign In"}
          </Button>

          <p className="text-center text-xs text-neutral-500">
            <Link href="/" className="hover:text-neutral-300 transition-colors">
              ← Back to portal home
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
