"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Input, Card, CardContent } from "@portalpro/ui";
import { Check, ChevronRight, Building2, Palette, Users } from "lucide-react";
import { API_URL } from "@/lib/env";

// ── Step schemas ────────────────────────────────────────────────────────────

const workspaceSchema = z.object({
  name: z.string().min(1, "Workspace name is required").max(200),
});

const brandingSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Enter a valid hex color"),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Enter a valid hex color"),
});

const inviteSchema = z.object({
  email: z.string().email("Enter a valid email").or(z.literal("")),
  name: z.string().max(200).optional(),
  role: z.enum(["ADMIN", "EDITOR", "VIEWER"]),
});

type WorkspaceInput = z.infer<typeof workspaceSchema>;
type BrandingInput = z.infer<typeof brandingSchema>;
type InviteInput = z.infer<typeof inviteSchema>;

// ── Props ────────────────────────────────────────────────────────────────────

interface Props {
  tenant: {
    id: string;
    name: string;
    primaryColor: string;
    secondaryColor: string;
    logo: string | null;
  };
}

// ── Step indicators ──────────────────────────────────────────────────────────

const STEPS = [
  { label: "Workspace", icon: Building2 },
  { label: "Branding", icon: Palette },
  { label: "Invite team", icon: Users },
];

// ── Component ────────────────────────────────────────────────────────────────

export function OnboardingWizard({ tenant }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 form
  const workspaceForm = useForm<WorkspaceInput>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: { name: tenant.name },
  });

  // Step 2 form
  const brandingForm = useForm<BrandingInput>({
    resolver: zodResolver(brandingSchema),
    defaultValues: {
      primaryColor: tenant.primaryColor,
      secondaryColor: tenant.secondaryColor,
    },
  });
  const watchedPrimary = brandingForm.watch("primaryColor");
  const watchedSecondary = brandingForm.watch("secondaryColor");

  // Step 3 form
  const inviteForm = useForm<InviteInput>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "", role: "EDITOR" },
  });

  async function handleWorkspaceSubmit(data: WorkspaceInput) {
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/tenants/current`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: data.name }),
      });
      if (!res.ok) throw new Error("Failed to update workspace name");
      setStep(1);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleBrandingSubmit(data: BrandingInput) {
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/tenants/current`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update branding");
      setStep(2);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleInviteSubmit(data: InviteInput) {
    setError(null);
    setIsSubmitting(true);
    try {
      if (data.email) {
        const res = await fetch(`${API_URL}/api/v1/tenants/current/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            email: data.email,
            name: data.name || data.email.split("@")[0],
            role: data.role,
          }),
        });
        if (!res.ok) {
          const body = (await res.json()) as { error?: { message?: string } };
          throw new Error(body.error?.message ?? "Failed to send invitation");
        }
      }
      // Onboarding complete — redirect to dashboard
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send invitation.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F3049] to-[#1B4D6E] flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome to PortalPro</h1>
          <p className="text-blue-200">Set up your workspace in a few quick steps</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center mb-8 gap-2">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isDone = i < step;
            const isActive = i === step;
            return (
              <div key={i} className="flex items-center">
                <div
                  className={[
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all",
                    isDone
                      ? "bg-[#E8B931] text-[#0F3049]"
                      : isActive
                        ? "bg-white text-[#1B4D6E]"
                        : "bg-white/20 text-white/60",
                  ].join(" ")}
                >
                  {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-white/40 mx-1" />
                )}
              </div>
            );
          })}
        </div>

        {/* Card */}
        <Card>
          <CardContent className="p-8">
            {error && (
              <div className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Step 0: Workspace name */}
            {step === 0 && (
              <form onSubmit={workspaceForm.handleSubmit(handleWorkspaceSubmit)}>
                <h2 className="text-xl font-semibold text-neutral-800 mb-1">
                  Name your workspace
                </h2>
                <p className="text-sm text-neutral-500 mb-6">
                  This is your agency's name — clients will see it in their portal.
                </p>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                    Workspace name
                  </label>
                  <Input
                    {...workspaceForm.register("name")}
                    placeholder="e.g. Acme Creative Studio"
                    className="w-full"
                  />
                  {workspaceForm.formState.errors.name && (
                    <p className="mt-1 text-xs text-red-600">
                      {workspaceForm.formState.errors.name.message}
                    </p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Saving…" : "Continue"}
                </Button>
              </form>
            )}

            {/* Step 1: Branding */}
            {step === 1 && (
              <form onSubmit={brandingForm.handleSubmit(handleBrandingSubmit)}>
                <h2 className="text-xl font-semibold text-neutral-800 mb-1">Brand your portal</h2>
                <p className="text-sm text-neutral-500 mb-6">
                  Choose colors that match your agency brand. You can change these later.
                </p>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                      Primary color
                    </label>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-9 w-9 rounded-md border border-neutral-200 flex-shrink-0"
                        style={{ backgroundColor: watchedPrimary }}
                      />
                      <Input
                        {...brandingForm.register("primaryColor")}
                        placeholder="#1B4D6E"
                        className="flex-1 font-mono text-sm"
                      />
                    </div>
                    {brandingForm.formState.errors.primaryColor && (
                      <p className="mt-1 text-xs text-red-600">
                        {brandingForm.formState.errors.primaryColor.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                      Secondary color
                    </label>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-9 w-9 rounded-md border border-neutral-200 flex-shrink-0"
                        style={{ backgroundColor: watchedSecondary }}
                      />
                      <Input
                        {...brandingForm.register("secondaryColor")}
                        placeholder="#2E86AB"
                        className="flex-1 font-mono text-sm"
                      />
                    </div>
                    {brandingForm.formState.errors.secondaryColor && (
                      <p className="mt-1 text-xs text-red-600">
                        {brandingForm.formState.errors.secondaryColor.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Live preview */}
                <div
                  className="rounded-lg p-4 mb-6 text-white text-sm"
                  style={{ backgroundColor: watchedPrimary }}
                >
                  <div className="font-semibold mb-1">Preview</div>
                  <div
                    className="inline-block px-3 py-1 rounded text-xs font-medium"
                    style={{ backgroundColor: watchedSecondary }}
                  >
                    Portal button
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep(0)}
                  >
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isSubmitting}>
                    {isSubmitting ? "Saving…" : "Continue"}
                  </Button>
                </div>
              </form>
            )}

            {/* Step 2: Invite team member */}
            {step === 2 && (
              <form onSubmit={inviteForm.handleSubmit(handleInviteSubmit)}>
                <h2 className="text-xl font-semibold text-neutral-800 mb-1">Invite your team</h2>
                <p className="text-sm text-neutral-500 mb-6">
                  Optionally invite a team member now. You can invite more from Settings later.
                </p>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                      Email address
                    </label>
                    <Input
                      {...inviteForm.register("email")}
                      type="email"
                      placeholder="colleague@example.com"
                      className="w-full"
                    />
                    {inviteForm.formState.errors.email && (
                      <p className="mt-1 text-xs text-red-600">
                        {inviteForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                      Name
                    </label>
                    <Input
                      {...inviteForm.register("name")}
                      placeholder="Full name"
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                      Role
                    </label>
                    <select
                      {...inviteForm.register("role")}
                      className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-[#1B4D6E]"
                    >
                      <option value="ADMIN">Admin — full access except billing</option>
                      <option value="EDITOR">Editor — create and edit projects</option>
                      <option value="VIEWER">Viewer — read-only access</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isSubmitting}>
                    {isSubmitting ? "Setting up…" : "Finish setup"}
                  </Button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    router.push("/");
                    router.refresh();
                  }}
                  className="mt-3 w-full text-center text-sm text-neutral-400 hover:text-neutral-600 transition-colors"
                >
                  Skip for now
                </button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
