"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Input } from "@portalpro/ui";
import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { forgotPasswordAction } from "@/lib/auth-actions";

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await forgotPasswordAction(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setSubmitted(true);
      }
    });
  }

  return (
    <Card className="shadow-modal">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4">
          <Image src="/logo-icon.png" alt="PortalPro" width={48} height={48} priority />
        </div>
        <CardTitle className="text-2xl">Reset your password</CardTitle>
        <CardDescription>
          {submitted
            ? "Check your inbox for reset instructions."
            : "Enter your email and we'll send you a reset link."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {submitted ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-2xl text-success">
              ✓
            </div>
            <p className="text-sm text-neutral-600">
              If an account exists for that email, you&apos;ll receive a password reset link
              within a few minutes.
            </p>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/login">Back to sign in</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-neutral-700">
                Email address
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@agency.com"
                required
                autoComplete="email"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</p>
            )}

            <Button className="w-full" size="lg" type="submit" disabled={isPending}>
              {isPending ? "Sending…" : "Send reset link"}
            </Button>

            <p className="text-center text-xs text-neutral-500">
              Remembered your password?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
