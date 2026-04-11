"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Avatar,
  AvatarFallback,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@portalpro/ui";
import { useToast } from "@portalpro/ui";
import { UserPlus, Trash2, ChevronDown } from "lucide-react";
import { API_URL } from "@/lib/env";

// Define form schema locally to avoid Zod optional/default issues with react-hook-form
const inviteFormSchema = z.object({
  email: z.string().email("Valid email is required"),
  name: z.string().min(1, "Name is required").max(200),
  role: z.enum(["OWNER", "ADMIN", "EDITOR", "VIEWER"]),
});
type InviteFormValues = z.infer<typeof inviteFormSchema>;

interface Member {
  id: string;
  role: string;
  user: {
    id: string;
    email: string;
    name: string;
    avatarUrl: string | null;
  };
}

interface Props {
  members: Member[];
  currentUserId: string;
  currentUserRole: string;
}

const ROLE_COLORS: Record<string, string> = {
  OWNER: "bg-[#E8B931]/20 text-[#92700d]",
  ADMIN: "bg-blue-100 text-blue-700",
  EDITOR: "bg-green-100 text-green-700",
  VIEWER: "bg-neutral-100 text-neutral-600",
};

const canManage = (role: string) => ["OWNER", "ADMIN"].includes(role);

/**
 * Team members list with invite modal and role management.
 */
export function TeamSettings({ members: initialMembers, currentUserId, currentUserRole }: Props) {
  const { toast } = useToast();
  const [members, setMembers] = useState(initialMembers);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: { email: "", name: "", role: "EDITOR" },
  });

  async function handleInvite(data: InviteFormValues) {
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/tenants/current/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      const body = (await res.json()) as { data?: Member; error?: { message?: string } };
      if (!res.ok) throw new Error(body.error?.message ?? "Failed to send invitation");

      if (body.data) setMembers((prev) => [...prev, body.data!]);
      setInviteOpen(false);
      form.reset();
      toast({ title: "Invitation sent", description: `${data.email} has been invited.` });
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

  async function handleRoleChange(memberId: string, newRole: string) {
    try {
      const res = await fetch(`${API_URL}/api/v1/tenants/current/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role: newRole }),
      });

      const body = (await res.json()) as { data?: Member; error?: { message?: string } };
      if (!res.ok) throw new Error(body.error?.message ?? "Failed to update role");

      if (body.data) {
        setMembers((prev) => prev.map((m) => (m.id === memberId ? body.data! : m)));
      }
      toast({ title: "Role updated" });
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to update role.",
        variant: "error",
      });
    }
  }

  async function handleRemove(memberId: string) {
    setRemovingId(memberId);
    try {
      const res = await fetch(`${API_URL}/api/v1/tenants/current/members/${memberId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: { message?: string } };
        throw new Error(body.error?.message ?? "Failed to remove member");
      }
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      toast({ title: "Member removed" });
    } catch (err: unknown) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to remove member.",
        variant: "error",
      });
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Team members ({members.length})</CardTitle>
          {canManage(currentUserRole) && (
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite member
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-neutral-100">
            {members.map((member) => {
              const initials = member.user.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);
              const isCurrentUser = member.user.id === currentUserId;

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between px-6 py-4"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      {member.user.avatarUrl && (
                        <img src={member.user.avatarUrl} alt={member.user.name} />
                      )}
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium text-neutral-800">
                        {member.user.name}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs text-neutral-400">(you)</span>
                        )}
                      </div>
                      <div className="text-xs text-neutral-400">{member.user.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {canManage(currentUserRole) && !isCurrentUser ? (
                      <div className="relative">
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value)}
                          className="appearance-none rounded-md border border-neutral-200 bg-white pl-3 pr-7 py-1.5 text-xs font-medium text-neutral-700 focus:outline-none focus:ring-2 focus:ring-[#1B4D6E] cursor-pointer"
                        >
                          <option value="OWNER">Owner</option>
                          <option value="ADMIN">Admin</option>
                          <option value="EDITOR">Editor</option>
                          <option value="VIEWER">Viewer</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-neutral-400 pointer-events-none" />
                      </div>
                    ) : (
                      <span
                        className={[
                          "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                          ROLE_COLORS[member.role] ?? "bg-neutral-100 text-neutral-600",
                        ].join(" ")}
                      >
                        {member.role}
                      </span>
                    )}

                    {canManage(currentUserRole) && !isCurrentUser && (
                      <button
                        onClick={() => handleRemove(member.id)}
                        disabled={removingId === member.id}
                        className="ml-1 rounded p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
                        title="Remove member"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite team member</DialogTitle>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(handleInvite)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">
                Email address
              </label>
              <Input
                {...form.register("email")}
                type="email"
                placeholder="colleague@example.com"
              />
              {form.formState.errors.email && (
                <p className="mt-1 text-xs text-red-600">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Name</label>
              <Input {...form.register("name")} placeholder="Full name" />
              {form.formState.errors.name && (
                <p className="mt-1 text-xs text-red-600">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1.5">Role</label>
              <select
                {...form.register("role")}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-[#1B4D6E]"
              >
                <option value="ADMIN">Admin</option>
                <option value="EDITOR">Editor</option>
                <option value="VIEWER">Viewer</option>
              </select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Sending…" : "Send invitation"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
