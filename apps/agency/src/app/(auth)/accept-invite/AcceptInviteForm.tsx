"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, PasswordInput, Card, CardContent } from "@portalpro/ui";

const schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

interface Props {
  token: string;
  email: string;
}

/**
 * Form for accepting a team invitation and setting a password.
 */
export function AcceptInviteForm({ token, email }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  async function onSubmit(data: FormValues) {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, password: data.password }),
      });

      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Failed to accept invitation");
      }

      router.push("/login?message=invite-accepted");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0F3049] to-[#1B4D6E] p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="mb-6 text-center">
            <div className="text-2xl font-bold text-[#1B4D6E] mb-1">PortalPro</div>
            <h1 className="text-xl font-semibold text-neutral-800 mt-4">
              Accept your invitation
            </h1>
            <p className="text-sm text-neutral-500 mt-1">
              Set a password for <strong>{email}</strong>
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Password
              </label>
              <PasswordInput {...form.register("password")} placeholder="Min. 8 characters" />
              {form.formState.errors.password && (
                <p className="mt-1 text-xs text-red-600">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Confirm password
              </label>
              <PasswordInput {...form.register("confirmPassword")} placeholder="Repeat password" />
              {form.formState.errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">
                  {form.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full mt-2" disabled={isSubmitting}>
              {isSubmitting ? "Setting up account…" : "Accept invitation"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
