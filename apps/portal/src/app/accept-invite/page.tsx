import { prisma } from "@portalpro/database";
import { redirect } from "next/navigation";
import { AcceptInviteForm } from "./AcceptInviteForm";
import { XCircle } from "lucide-react";

interface AcceptInvitePageProps {
  searchParams: { token?: string; email?: string; portalId?: string };
}

/**
 * Client invite acceptance page — portal app.
 *
 * URL: /accept-invite?token=<token>&email=<email>&portalId=<portalId>
 *
 * Validates the token against the DB, then renders the password-setup form.
 * If the token is missing, invalid, or expired it shows an error state.
 */
export default async function AcceptInvitePage({ searchParams }: AcceptInvitePageProps) {
  const { token, email, portalId } = searchParams;

  // Redirect to login if required params are missing
  if (!token || !email || !portalId) {
    redirect("/login");
  }

  const identifier = `client-invite:${email}:${portalId}`;

  // Look up and validate the token
  const record = await prisma.verificationToken.findUnique({
    where: { identifier_token: { identifier, token } },
  });

  const isExpired = record ? record.expires < new Date() : false;

  if (!record || isExpired) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-6 w-6 text-red-500" />
          </div>
          <h1 className="text-xl font-semibold text-neutral-900">Invitation expired</h1>
          <p className="mt-2 text-sm text-neutral-500">
            This invitation link has expired or already been used. Please ask your agency to send a
            new invite.
          </p>
        </div>
      </div>
    );
  }

  // Fetch user and portal details to personalise the form
  const [user, portal] = await Promise.all([
    prisma.user.findUnique({ where: { email }, select: { name: true } }),
    prisma.clientPortal.findUnique({ where: { id: portalId }, select: { name: true } }),
  ]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-md">
        <AcceptInviteForm
          token={token}
          email={email}
          portalId={portalId}
          clientName={user?.name ?? email}
          portalName={portal?.name ?? "your portal"}
        />
      </div>
    </div>
  );
}
