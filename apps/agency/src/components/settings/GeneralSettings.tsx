"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateTenantSchema, type UpdateTenantInput } from "@portalpro/types";
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from "@portalpro/ui";
import { useToast } from "@portalpro/ui";
import { API_URL } from "@/lib/env";
import { canAdmin } from "@/lib/rbac";

interface Props {
  tenant: {
    id: string;
    name: string;
    slug: string;
    customDomain: string | null;
    plan: string;
  };
  userRole?: string | null;
}

/**
 * General workspace settings: name and custom domain.
 * Form fields are read-only for non-admin roles (EDITOR / VIEWER).
 */
export function GeneralSettings({ tenant, userRole }: Props) {
  const isAdmin = canAdmin(userRole);
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<UpdateTenantInput>({
    resolver: zodResolver(updateTenantSchema),
    defaultValues: {
      name: tenant.name,
      customDomain: tenant.customDomain ?? "",
    },
  });

  async function onSubmit(data: UpdateTenantInput) {
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/tenants/current`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: data.name,
          customDomain: data.customDomain || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to update settings");
      toast({ title: "Settings saved", description: "Workspace settings updated." });
    } catch {
      toast({ title: "Error", description: "Failed to save settings. Please try again.", variant: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Workspace</CardTitle>
        </CardHeader>
        <CardContent>
          {!isAdmin && (
            <p className="mb-4 rounded-lg bg-neutral-50 px-4 py-3 text-sm text-neutral-500">
              You need Admin or Owner role to modify workspace settings.
            </p>
          )}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Workspace name
              </label>
              <Input
                {...form.register("name")}
                placeholder="Acme Creative Studio"
                disabled={!isAdmin}
                className={!isAdmin ? "bg-neutral-50 text-neutral-500" : ""}
              />
              {form.formState.errors.name && (
                <p className="mt-1 text-xs text-red-600">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Slug
              </label>
              <Input value={tenant.slug} disabled className="bg-neutral-50 text-neutral-400" />
              <p className="mt-1 text-xs text-neutral-400">
                Used in portal URLs. Cannot be changed after creation.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Custom domain{" "}
                <span className="text-neutral-400 font-normal">(optional)</span>
              </label>
              <Input
                {...form.register("customDomain")}
                placeholder="portal.youragency.com"
                disabled={!isAdmin}
                className={!isAdmin ? "bg-neutral-50 text-neutral-500" : ""}
              />
              <p className="mt-1 text-xs text-neutral-400">
                Point a CNAME record to portalpro.app to use a custom domain.
              </p>
            </div>

            {isAdmin && (
              <div className="pt-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving…" : "Save changes"}
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-neutral-700 capitalize">
                {tenant.plan.toLowerCase()} plan
              </div>
              <div className="text-xs text-neutral-400 mt-0.5">
                All features are included during the portfolio demo.
              </div>
            </div>
            <span className="rounded-full bg-[#1B4D6E]/10 px-3 py-1 text-xs font-semibold text-[#1B4D6E]">
              {tenant.plan}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
