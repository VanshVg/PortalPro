"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Card, CardContent, CardHeader, CardTitle, CardDescription } from "@portalpro/ui";
import { KeyRound } from "lucide-react";

interface Props {
  token: string;
  email: string;
  portalId: string;
  clientName: string;
  portalName: string;
}

/**
 * Password-setup form for clients accepting a portal invitation.
 * Submits to the local API route which validates the token and sets the password.
 */
export function AcceptInviteForm({ token, email, portalId, clientName, portalName }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;
    const confirm = (form.elements.namedItem("confirm") as HTMLInputElement).value;

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/auth/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, portalId, password }),
      });

      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Something went wrong. Please try again.");
        return;
      }

      // Redirect to login so the client can sign in with their new password
      router.push(`/login?message=Account+activated!+Please+sign+in.`);
    });
  }

  return (
    <Card className="shadow-modal border-neutral-200 bg-white">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <KeyRound className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl text-neutral-900">Set your password</CardTitle>
        <CardDescription className="text-neutral-500">
          Welcome, {clientName}! You&apos;ve been invited to{" "}
          <span className="font-medium text-neutral-700">{portalName}</span>. Create a password to
          access your portal.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email-display" className="block text-sm font-medium text-neutral-700 mb-1.5">
              Email
            </label>
            <Input
              id="email-display"
              value={email}
              readOnly
              className="bg-neutral-50 text-neutral-500 cursor-not-allowed"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-neutral-700 mb-1.5">
              Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="At least 8 characters"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-neutral-700 mb-1.5">
              Confirm password
            </label>
            <Input
              id="confirm"
              name="confirm"
              type="password"
              placeholder="Repeat your password"
              required
              autoComplete="new-password"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Activating account…" : "Activate account & sign in"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
