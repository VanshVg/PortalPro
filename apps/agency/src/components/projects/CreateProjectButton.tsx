"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createProjectSchema, type CreateProjectInput } from "@portalpro/types";
import {
  Button,
  Input,
  Textarea,
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
  portals: Array<{ id: string; name: string }>;
  variant?: "primary" | "outline";
  userRole?: string | null;
}

/**
 * Button + dialog to create a new project.
 * Hidden for VIEWER role — requires EDITOR or higher.
 */
export function CreateProjectButton({ portals, variant = "primary", userRole }: Props) {
  if (!canWrite(userRole)) return null;
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: "",
      description: "",
      clientPortalId: portals[0]?.id ?? "",
    },
  });

  async function onSubmit(data: CreateProjectInput) {
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      const body = (await res.json()) as { data?: { id: string }; error?: { message?: string } };
      if (!res.ok) throw new Error(body.error?.message ?? "Failed to create project");

      setOpen(false);
      form.reset();
      toast({ title: "Project created", description: data.name });
      router.refresh();
      if (body.data) router.push(`/projects/${body.data.id}`);
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create project.",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Button variant={variant} onClick={() => setOpen(true)} disabled={portals.length === 0}>
        <Plus className="mr-2 h-4 w-4" />
        New project
      </Button>

      {portals.length === 0 && (
        <p className="text-xs text-neutral-400 mt-1">Create a client portal first.</p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create project</DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Project name
              </label>
              <Input {...form.register("name")} placeholder="e.g. Brand Redesign 2025" autoFocus />
              {form.formState.errors.name && (
                <p className="mt-1 text-xs text-red-600">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Client portal
              </label>
              <select
                {...form.register("clientPortalId")}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-[#1B4D6E]"
              >
                {portals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {form.formState.errors.clientPortalId && (
                <p className="mt-1 text-xs text-red-600">
                  {form.formState.errors.clientPortalId.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Description <span className="text-neutral-400 font-normal">(optional)</span>
              </label>
              <Textarea
                {...form.register("description")}
                placeholder="Brief overview of the project…"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  Start date
                </label>
                <Input {...form.register("startDate")} type="date" />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                  End date
                </label>
                <Input {...form.register("endDate")} type="date" />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating…" : "Create project"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
