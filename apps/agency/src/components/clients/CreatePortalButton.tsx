"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createPortalSchema, type CreatePortalInput } from "@portalpro/types";
import {
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@portalpro/ui";
import { useToast } from "@portalpro/ui";
import { Plus } from "lucide-react";
import { API_URL } from "@/lib/env";
import { canWrite } from "@/lib/rbac";

interface Props {
  variant?: "primary" | "outline";
  userRole?: string | null;
}

/**
 * Button that opens a dialog to create a new client portal.
 * Hidden entirely for VIEWER role — write access requires EDITOR or higher.
 */
export function CreatePortalButton({ variant = "primary", userRole }: Props) {
  if (!canWrite(userRole)) return null;
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreatePortalInput>({
    resolver: zodResolver(createPortalSchema),
    defaultValues: { name: "", primaryColor: "#1B4D6E" },
  });

  async function onSubmit(data: CreatePortalInput) {
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/portals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      const body = (await res.json()) as { data?: { id: string }; error?: { message?: string } };
      if (!res.ok) throw new Error(body.error?.message ?? "Failed to create portal");

      setOpen(false);
      form.reset();
      toast({ title: "Portal created", description: `${data.name} is ready.` });
      router.refresh();
      if (body.data) router.push(`/clients/${body.data.id}`);
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create portal.",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        New client portal
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create client portal</DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Client name
              </label>
              <Input
                {...form.register("name")}
                placeholder="e.g. Acme Corporation"
                autoFocus
              />
              {form.formState.errors.name && (
                <p className="mt-1 text-xs text-red-600">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Brand color <span className="text-neutral-400 font-normal">(optional)</span>
              </label>
              <div className="flex items-center gap-2">
                <div
                  className="h-9 w-9 rounded-md border border-neutral-200 flex-shrink-0"
                  style={{ backgroundColor: form.watch("primaryColor") ?? "#1B4D6E" }}
                />
                <Input
                  {...form.register("primaryColor")}
                  placeholder="#1B4D6E"
                  className="font-mono"
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating…" : "Create portal"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
