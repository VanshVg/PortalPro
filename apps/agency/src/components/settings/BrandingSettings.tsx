"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from "@portalpro/ui";
import { useToast } from "@portalpro/ui";
import { Upload, X } from "lucide-react";
import Image from "next/image";
import { API_URL } from "@/lib/env";
import { canAdmin } from "@/lib/rbac";

const brandingSchema = z.object({
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Enter a valid hex color like #1B4D6E"),
  secondaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Enter a valid hex color like #2E86AB"),
});
type BrandingInput = z.infer<typeof brandingSchema>;

interface Props {
  tenant: {
    primaryColor: string;
    secondaryColor: string;
    logo: string | null;
  };
  userRole?: string | null;
}

/**
 * Branding settings: logo upload + primary/secondary colors with live preview.
 * Upload and save actions are hidden for non-admin roles.
 */
export function BrandingSettings({ tenant, userRole }: Props) {
  const isAdmin = canAdmin(userRole);
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(tenant.logo);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<BrandingInput>({
    resolver: zodResolver(brandingSchema),
    defaultValues: {
      primaryColor: tenant.primaryColor,
      secondaryColor: tenant.secondaryColor,
    },
  });

  const watchedPrimary = form.watch("primaryColor");
  const watchedSecondary = form.watch("secondaryColor");

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
    if (file.size > MAX_SIZE) {
      toast({ title: "File too large", description: "Logo must be under 2 MB.", variant: "error" });
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file.", variant: "error" });
      return;
    }

    setIsUploadingLogo(true);
    try {
      // 1. Request presigned URL from the dedicated logo endpoint
      const params = new URLSearchParams({
        fileName: file.name,
        mimeType: file.type,
        fileSize: String(file.size),
      });
      const presignRes = await fetch(`${API_URL}/api/v1/tenants/current/logo-presign?${params}`, {
        credentials: "include",
      });
      if (!presignRes.ok) throw new Error("Could not get upload URL");
      const { data: { uploadUrl, key } } = (await presignRes.json()) as {
        data: { uploadUrl: string; key: string };
      };

      // 2. PUT file directly to R2
      await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      // 3. Confirm: update tenant logo URL
      const confirmRes = await fetch(`${API_URL}/api/v1/tenants/current/logo`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ logoUrl: key }),
      });
      if (!confirmRes.ok) throw new Error("Failed to update logo");

      // Show local preview using object URL
      setLogoPreview(URL.createObjectURL(file));
      toast({ title: "Logo updated", description: "Your workspace logo has been saved." });
    } catch {
      toast({ title: "Upload failed", description: "Could not upload logo. Try again.", variant: "error" });
    } finally {
      setIsUploadingLogo(false);
      // Reset file input so the same file can be re-selected if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemoveLogo() {
    setIsUploadingLogo(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/tenants/current/logo`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ logoUrl: null }),
      });
      if (!res.ok) throw new Error("Failed to remove logo");
      setLogoPreview(null);
      toast({ title: "Logo removed" });
    } catch {
      toast({ title: "Error", description: "Failed to remove logo.", variant: "error" });
    } finally {
      setIsUploadingLogo(false);
    }
  }

  async function onSubmit(data: BrandingInput) {
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/tenants/current`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update branding");
      toast({ title: "Branding saved", description: "Portal colors updated." });
    } catch {
      toast({ title: "Error", description: "Failed to save branding.", variant: "error" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Logo Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Workspace Logo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-5">
            {/* Preview */}
            <div className="h-20 w-20 flex-shrink-0 rounded-xl border border-neutral-200 bg-neutral-50 flex items-center justify-center overflow-hidden">
              {logoPreview ? (
                <Image
                  src={logoPreview}
                  alt="Workspace logo"
                  width={80}
                  height={80}
                  className="h-full w-full object-contain"
                />
              ) : (
                <Upload className="h-7 w-7 text-neutral-300" />
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm text-neutral-600">
                Upload your workspace logo. PNG or SVG, max 2 MB. Recommended size: 200×200 px.
              </p>
              {isAdmin ? (
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoChange}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isUploadingLogo}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {isUploadingLogo ? "Uploading…" : "Upload logo"}
                  </Button>
                  {logoPreview && (
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={isUploadingLogo}
                      onClick={handleRemoveLogo}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-neutral-400">
                  Admin or Owner role required to change the logo.
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Brand Colors</CardTitle>
        </CardHeader>
        <CardContent>
          {!isAdmin && (
            <p className="mb-4 rounded-lg bg-neutral-50 px-4 py-3 text-sm text-neutral-500">
              You need Admin or Owner role to modify branding settings.
            </p>
          )}
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
                    {...form.register("primaryColor")}
                    placeholder="#1B4D6E"
                    className={`font-mono${!isAdmin ? " bg-neutral-50 text-neutral-500" : ""}`}
                    disabled={!isAdmin}
                  />
                </div>
                {form.formState.errors.primaryColor && (
                  <p className="mt-1 text-xs text-red-600">
                    {form.formState.errors.primaryColor.message}
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
                    {...form.register("secondaryColor")}
                    placeholder="#2E86AB"
                    className={`font-mono${!isAdmin ? " bg-neutral-50 text-neutral-500" : ""}`}
                    disabled={!isAdmin}
                  />
                </div>
                {form.formState.errors.secondaryColor && (
                  <p className="mt-1 text-xs text-red-600">
                    {form.formState.errors.secondaryColor.message}
                  </p>
                )}
              </div>
            </div>

            {/* Live preview */}
            <div
              className="mt-4 rounded-xl p-6 text-white"
              style={{ backgroundColor: watchedPrimary }}
            >
              <div className="text-lg font-bold mb-1">Portal Preview</div>
              <div className="text-sm opacity-80 mb-4">
                This is how your client portal header will look.
              </div>
              <button
                type="button"
                className="px-4 py-2 rounded-lg text-sm font-semibold"
                style={{ backgroundColor: watchedSecondary }}
              >
                View project
              </button>
            </div>

            {isAdmin && (
              <div className="pt-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving…" : "Save branding"}
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
