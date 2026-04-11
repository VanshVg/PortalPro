import nodemailer from "nodemailer";
import { render } from "@react-email/components";
import { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, AGENCY_URL } from "./env";

/**
 * Creates a Nodemailer transporter from environment variables.
 * Requires: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 */
function createTransporter() {
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false, // STARTTLS
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

/**
 * Returns true when all required SMTP env vars are present.
 */
function isSmtpConfigured(): boolean {
  return Boolean(SMTP_USER && SMTP_PASS);
}

/** Sends a rendered HTML email or logs in dev mode. */
async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!isSmtpConfigured()) {
    console.log(`\n[DEV] Email — subject: "${subject}" → ${to}`);
    return;
  }
  const transporter = createTransporter();
  await transporter.sendMail({ from: SMTP_FROM, to, subject, html });
}

/**
 * Sends the email verification link to a new user.
 */
export async function sendVerificationEmail({
  to,
  userName,
  verifyUrl,
}: {
  to: string;
  userName: string;
  verifyUrl: string;
}): Promise<void> {
  if (!isSmtpConfigured()) {
    console.log("\n[DEV] Verification email — would send to:", to);
    console.log("   Link:", verifyUrl, "\n");
    return;
  }
  const { createElement } = await import("react");
  const { VerifyEmail } = await import("./templates/VerifyEmail");
  const html = await render(createElement(VerifyEmail, { userName, verifyUrl, agencyUrl: AGENCY_URL }));
  await sendEmail(to, "Verify your PortalPro email address", html);
}

/**
 * Sends a password reset link to an existing user.
 */
export async function sendPasswordResetEmail({
  to,
  userName,
  resetUrl,
}: {
  to: string;
  userName: string;
  resetUrl: string;
}): Promise<void> {
  if (!isSmtpConfigured()) {
    console.log("\n[DEV] Password reset email — would send to:", to);
    console.log("   Link:", resetUrl, "\n");
    return;
  }
  const { createElement } = await import("react");
  const { ResetPassword } = await import("./templates/ResetPassword");
  const html = await render(createElement(ResetPassword, { userName, resetUrl, agencyUrl: AGENCY_URL }));
  await sendEmail(to, "Reset your PortalPro password", html);
}

/**
 * Sends a team workspace invitation to a new member.
 */
export async function sendTeamInviteEmail({
  to,
  inviteeName,
  workspaceName,
  inviteUrl,
}: {
  to: string;
  inviteeName: string;
  workspaceName: string;
  inviteUrl: string;
}): Promise<void> {
  if (!isSmtpConfigured()) {
    console.log(`\n[DEV] Team invite — workspace: "${workspaceName}" → ${to}`);
    console.log("   Link:", inviteUrl, "\n");
    return;
  }
  const { createElement } = await import("react");
  const { TeamInvite } = await import("./templates/TeamInvite");
  const html = await render(createElement(TeamInvite, { inviteeName, workspaceName, inviteUrl }));
  await sendEmail(to, `You've been invited to join ${workspaceName} on PortalPro`, html);
}

/**
 * Sends a client portal invitation.
 */
export async function sendClientInviteEmail({
  to,
  clientName,
  portalName,
  inviteUrl,
}: {
  to: string;
  clientName: string;
  portalName: string;
  inviteUrl: string;
}): Promise<void> {
  if (!isSmtpConfigured()) {
    console.log(`\n[DEV] Client invite — portal: "${portalName}" → ${to}`);
    console.log("   Link:", inviteUrl, "\n");
    return;
  }
  const { createElement } = await import("react");
  const { ClientInvite } = await import("./templates/ClientInvite");
  const html = await render(createElement(ClientInvite, { clientName, portalName, inviteUrl }));
  await sendEmail(to, `Your ${portalName} client portal is ready`, html);
}
