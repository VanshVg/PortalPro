"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { UserPlus } from "lucide-react";
import { API_URL } from "@/lib/env";
import { canWrite } from "@/lib/rbac";

const inviteClientFormSchema = z.object({
  email: z.string().email("Valid email is required"),
  name: z.string().min(1, "Name is required").max(200),
  role: z.enum(["ADMIN", "VIEWER"]),
});
type InviteClientFormValues = z.infer<typeof inviteClientFormSchema>;

interface Props {
  portalId: string;
  userRole?: string | null;
}

/**
 * Button that opens a dialog to invite a client to a portal.
 * Hidden for VIEWER role — requires EDITOR or higher.
 */
export function InviteClientButton({ portalId, userRole }: Props) {
  if (!canWrite(userRole)) return null;
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<InviteClientFormValues>({
    resolver: zodResolver(inviteClientFormSchema),
    defaultValues: { email: "", name: "", role: "VIEWER" },
  });

  async function onSubmit(data: InviteClientFormValues) {
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/portals/${portalId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      const body = (await res.json()) as { error?: { message?: string } };
      if (!res.ok) throw new Error(body.error?.message ?? "Failed to send invitation");

      setOpen(false);
      form.reset();
      toast({
        title: "Invitation sent",
        description: `${data.email} has been invited to the portal.`,
      });
      router.refresh();
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to send invitation.",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserPlus className="mr-2 h-4 w-4" />
        Invite client
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite client</DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Email address
              </label>
              <Input
                {...form.register("email")}
                type="email"
                placeholder="client@example.com"
                autoFocus
              />
              {form.formState.errors.email && (
                <p className="mt-1 text-xs text-red-600">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Name</label>
              <Input {...form.register("name")} placeholder="Client name" />
              {form.formState.errors.name && (
                <p className="mt-1 text-xs text-red-600">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Access</label>
              <select
                {...form.register("role")}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-[#1B4D6E]"
              >
                <option value="VIEWER">Viewer — can view projects and files</option>
                <option value="ADMIN">Admin — can manage portal settings</option>
              </select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Sending…" : "Send invitation"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
