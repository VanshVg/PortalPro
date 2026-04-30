"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, PasswordInput } from "@portalpro/ui";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useTransition, Suspense } from "react";
import { resetPasswordAction } from "@/lib/auth-actions";

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const email = searchParams.get("email") ?? "";

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Invalid link — no token/email in URL
  if (!token || !email) {
    return (
      <Card className="shadow-modal">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Image src="/logo-icon.png" alt="PortalPro" width={48} height={48} priority />
          </div>
          <CardTitle className="text-2xl">Invalid reset link</CardTitle>
          <CardDescription>This password reset link is missing required information.</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button className="w-full" asChild>
            <Link href="/forgot-password">Request a new reset link</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    const confirm = (form.elements.namedItem("confirmPassword") as HTMLInputElement).value;

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    const formData = new FormData();
    formData.set("email", email);
    formData.set("token", token);
    formData.set("password", password);

    startTransition(async () => {
      const result = await resetPasswordAction(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    });
  }

  if (success) {
    return (
      <Card className="shadow-modal">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Image src="/logo-icon.png" alt="PortalPro" width={48} height={48} priority />
          </div>
          <CardTitle className="text-2xl">Password updated</CardTitle>
          <CardDescription>Your password has been changed successfully.</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="mb-4 mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-2xl text-success">
            ✓
          </div>
          <Button className="w-full" asChild>
            <Link href="/login">Sign in with new password</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-modal">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4">
          <Image src="/logo-icon.png" alt="PortalPro" width={48} height={48} priority />
        </div>
        <CardTitle className="text-2xl">Set new password</CardTitle>
        <CardDescription>Choose a strong password for your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-neutral-700">
              New password
            </label>
            <PasswordInput
              id="password"
              name="password"
              placeholder="Min. 8 characters"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-neutral-700">
              Confirm new password
            </label>
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              placeholder="Repeat your password"
              required
              autoComplete="new-password"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</p>
          )}

          <Button className="w-full" size="lg" type="submit" disabled={isPending}>
            {isPending ? "Updating…" : "Update password"}
          </Button>

          <p className="text-center text-xs text-neutral-500">
            <Link href="/login" className="text-primary hover:underline">
              Back to sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
