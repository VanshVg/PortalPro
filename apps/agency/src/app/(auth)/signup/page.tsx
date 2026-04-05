"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Input, PasswordInput } from "@portalpro/ui";
import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { signupAction } from "@/lib/auth-actions";

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    const password = formData.get("password") as string;
    const confirm = formData.get("confirmPassword") as string;
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    startTransition(async () => {
      const result = await signupAction(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <Card className="shadow-modal">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4">
          <Image src="/logo-icon.png" alt="PortalPro" width={48} height={48} priority />
        </div>
        <CardTitle className="text-2xl">Create your workspace</CardTitle>
        <CardDescription>Start your free PortalPro account</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="workspaceName" className="text-sm font-medium text-neutral-700">
              Workspace name
            </label>
            <Input
              id="workspaceName"
              name="workspaceName"
              type="text"
              placeholder="Acme Agency"
              required
              autoComplete="organization"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium text-neutral-700">
              Your full name
            </label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="Jane Smith"
              required
              autoComplete="name"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-neutral-700">
              Work email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="jane@agency.com"
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-neutral-700">
              Password
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
              Confirm password
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
            {isPending ? "Creating workspace…" : "Create workspace"}
          </Button>

          <p className="text-center text-xs text-neutral-500">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>

          <p className="text-center text-[11px] text-neutral-400">
            By creating an account, you agree to our{" "}
            <a href="#" className="underline">Terms of Service</a> and{" "}
            <a href="#" className="underline">Privacy Policy</a>.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
