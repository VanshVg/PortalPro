import { prisma } from "@portalpro/database";
import { redirect } from "next/navigation";
import { AcceptInviteForm } from "./AcceptInviteForm";

interface Props {
  searchParams: { token?: string; email?: string };
}

/**
 * Accept team workspace invitation page.
 * Validates the token and lets the user set their password.
 */
export default async function AcceptInvitePage({ searchParams }: Props) {
  const { token, email } = searchParams;

  if (!token || !email) {
    redirect("/login?error=invalid-invite");
  }

  const record = await prisma.verificationToken.findUnique({ where: { token } });

  if (!record || record.identifier !== `team-invite:${email}`) {
    redirect("/login?error=invalid-invite");
  }

  if (record.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { token } });
    redirect("/login?error=expired-invite");
  }

  return <AcceptInviteForm token={token} email={email} />;
}
