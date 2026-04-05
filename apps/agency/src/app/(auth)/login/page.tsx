"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button, Input, PasswordInput } from "@portalpro/ui";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { loginAction, resendVerificationAction } from "@/lib/auth-actions";

const ERROR_MESSAGES: Record<string, string> = {
  "invalid-link": "The verification link is invalid. Please request a new one.",
  "link-expired": "Your verification link has expired. Request a new one below.",
};

export default function LoginPage() {
  const searchParams = useSearchParams();
  const verified = searchParams.get("verified") === "true";
  const passwordReset = searchParams.get("reset") === "true";
  const urlError = searchParams.get("error");
  const expiredEmail = searchParams.get("email") ?? "";

  const [error, setError] = useState<string | null>(null);
  const [isUnverified, setIsUnverified] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [resentOk, setResentOk] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isResending, startResendTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    setIsUnverified(false);
    setResentOk(false);
    startTransition(async () => {
      const result = await loginAction(formData);
      if (result?.error) {
        setError(result.error);
        if (result.unverified) {
          setIsUnverified(true);
          setUnverifiedEmail(formData.get("email") as string);
        }
      }
    });
  }

  function handleResend(email: string) {
    startResendTransition(async () => {
      await resendVerificationAction(email);
      setResentOk(true);
      setError(null);
    });
  }

  return (
    <Card className="shadow-modal">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4">
          <Image src="/logo-icon.png" alt="PortalPro" width={48} height={48} priority />
        </div>
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>Sign in to your agency dashboard</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Email verified success banner */}
        {verified && (
          <div className="rounded-lg bg-success/10 px-4 py-3 text-sm text-success font-medium text-center">
            ✓ Email verified! You can now sign in.
          </div>
        )}

        {/* Password reset success banner */}
        {passwordReset && (
          <div className="rounded-lg bg-success/10 px-4 py-3 text-sm text-success font-medium text-center">
            ✓ Password updated! Sign in with your new password.
          </div>
        )}

        {/* URL-based errors (from verify route) */}
        {urlError && !verified && (
          <div className="space-y-2">
            <p className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">
              {ERROR_MESSAGES[urlError] ?? "Something went wrong with the verification link."}
            </p>
            {urlError === "link-expired" && expiredEmail && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => handleResend(expiredEmail)}
                disabled={isResending || resentOk}
              >
                {resentOk ? "✓ New link sent!" : isResending ? "Sending…" : "Resend verification email"}
              </Button>
            )}
          </div>
        )}

        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-neutral-700">
              Email
            </label>
            <Input id="email" name="email" type="email" placeholder="you@agency.com" required autoComplete="email" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium text-neutral-700">
                Password
              </label>
              <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <PasswordInput
              id="password"
              name="password"
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />
          </div>

          {/* Form errors */}
          {error && (
            <div className="space-y-2">
              <p className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error">{error}</p>
              {isUnverified && !resentOk && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleResend(unverifiedEmail)}
                  disabled={isResending}
                >
                  {isResending ? "Sending…" : "Resend verification email"}
                </Button>
              )}
              {resentOk && (
                <p className="text-center text-sm text-success font-medium">✓ Verification email sent!</p>
              )}
            </div>
          )}

          <Button className="w-full" size="lg" type="submit" disabled={isPending}>
            {isPending ? "Signing in…" : "Sign In"}
          </Button>
        </form>

        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-neutral-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-neutral-500">Or continue with</span>
          </div>
        </div>

        <Button variant="outline" className="w-full" type="button" disabled>
          Send Magic Link
          <span className="ml-2 text-[10px] text-neutral-400">(coming soon)</span>
        </Button>

        <p className="text-center text-xs text-neutral-500">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-primary hover:underline">
            Create workspace
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
