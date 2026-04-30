"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription, Button } from "@portalpro/ui";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useTransition, Suspense } from "react";
import { resendVerificationAction } from "@/lib/auth-actions";

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleResend() {
    setError(null);
    startTransition(async () => {
      const result = await resendVerificationAction(email);
      if (result.error) {
        setError(result.error);
      } else {
        setResent(true);
      }
    });
  }

  return (
    <Card className="shadow-modal">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4">
          <Image src="/logo-icon.png" alt="PortalPro" width={48} height={48} priority />
        </div>
        <CardTitle className="text-2xl">Check your inbox</CardTitle>
        <CardDescription>
          We sent a verification link to{" "}
          <span className="font-medium text-neutral-700">{email || "your email"}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Steps */}
        <div className="rounded-xl bg-primary-50 p-4 space-y-2">
          {[
            "Open the email from PortalPro",
            'Click the "Verify Email Address" button',
            "You'll be redirected back to sign in",
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white mt-0.5">
                {i + 1}
              </span>
              <span className="text-sm text-neutral-700">{step}</span>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-neutral-500">
          The link expires in <strong>24 hours</strong>. Can&apos;t find the email? Check your
          spam folder.
        </p>

        {error && (
          <p className="rounded-lg bg-error/10 px-3 py-2 text-sm text-error text-center">{error}</p>
        )}

        {resent ? (
          <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success text-center font-medium">
            ✓ Verification email resent successfully.
          </p>
        ) : (
          <Button
            variant="outline"
            className="w-full"
            onClick={handleResend}
            disabled={isPending}
          >
            {isPending ? "Sending…" : "Resend verification email"}
          </Button>
        )}

        <p className="text-center text-xs text-neutral-500">
          Wrong email?{" "}
          <Link href="/signup" className="text-primary hover:underline">
            Sign up again
          </Link>
          {" · "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
