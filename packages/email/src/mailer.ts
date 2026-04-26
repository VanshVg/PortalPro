import nodemailer from "nodemailer";
import { render } from "@react-email/components";
import { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, AGENCY_URL, PORTAL_URL } from "./env";

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

/**
 * Notifies the client when an agency submits a deliverable for review.
 * If `to` is not provided (client emails not available), logs to console only.
 */
export async function sendDeliverableSubmittedEmail({
  to,
  deliverableTitle,
  projectName,
  reviewUrl,
}: {
  to?: string;
  deliverableTitle: string;
  projectName?: string;
  reviewUrl?: string;
}): Promise<void> {
  if (!to) {
    console.log(`\n[DEV] Deliverable submitted — "${deliverableTitle}" (no client email on record)\n`);
    return;
  }
  if (!isSmtpConfigured()) {
    console.log(`\n[DEV] Deliverable submitted — "${deliverableTitle}" → ${to}\n`);
    return;
  }
  const { createElement } = await import("react");
  const { DeliverableSubmitted } = await import("./templates/DeliverableNotification");
  const html = await render(
    createElement(DeliverableSubmitted, {
      deliverableTitle,
      projectName: projectName ?? "Your project",
      reviewUrl: reviewUrl ?? AGENCY_URL,
    }),
  );
  await sendEmail(to, `New deliverable ready for review: ${deliverableTitle}`, html);
}

/**
 * Notifies the agency when a client approves or requests a revision.
 */
export async function sendDeliverableReviewedEmail({
  to,
  deliverableTitle,
  decision,
  feedback,
  projectName,
  deliverableUrl,
}: {
  to?: string;
  deliverableTitle: string;
  decision: "approved" | "revision_requested";
  feedback?: string;
  projectName?: string;
  deliverableUrl?: string;
}): Promise<void> {
  if (!to) {
    console.log(
      `\n[DEV] Deliverable reviewed (${decision}) — "${deliverableTitle}" (no agency email on record)\n`,
    );
    return;
  }
  if (!isSmtpConfigured()) {
    console.log(`\n[DEV] Deliverable reviewed (${decision}) — "${deliverableTitle}" → ${to}\n`);
    return;
  }
  const { createElement } = await import("react");
  const { DeliverableReviewed } = await import("./templates/DeliverableNotification");
  const subject =
    decision === "approved"
      ? `Deliverable approved: ${deliverableTitle}`
      : `Revision requested on: ${deliverableTitle}`;
  const html = await render(
    createElement(DeliverableReviewed, {
      deliverableTitle,
      projectName: projectName ?? "Your project",
      decision,
      feedback,
      deliverableUrl: deliverableUrl ?? AGENCY_URL,
    }),
  );
  await sendEmail(to, subject, html);
}

/**
 * Sends an invoice to a client.
 */
export async function sendInvoiceEmail({
  to,
  invoiceNumber,
  amount,
  currency,
  dueDate,
  paymentUrl,
}: {
  to: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  dueDate: string | null;
  paymentUrl?: string;
}): Promise<void> {
  if (!isSmtpConfigured()) {
    console.log(`\n[DEV] Invoice sent — #${invoiceNumber} → ${to}`);
    if (paymentUrl) console.log("   Pay URL:", paymentUrl);
    console.log();
    return;
  }
  const { createElement } = await import("react");
  const { InvoiceSent } = await import("./templates/InvoiceEmail");
  const html = await render(
    createElement(InvoiceSent, { invoiceNumber, amount, currency, dueDate, paymentUrl }),
  );
  await sendEmail(to, `Invoice ${invoiceNumber} from PortalPro`, html);
}

/**
 * Notifies a user that a new message was posted in a project they have access to.
 */
export async function sendNewMessageEmail({
  to,
  recipientName,
  senderName,
  projectName,
  messagePreview,
  messagesUrl,
  isPortalUser = false,
}: {
  to: string;
  recipientName: string;
  senderName: string;
  projectName: string;
  messagePreview: string;
  messagesUrl: string;
  isPortalUser?: boolean;
}): Promise<void> {
  if (!isSmtpConfigured()) {
    console.log(`\n[DEV] New message — "${projectName}" from ${senderName} → ${to}\n`);
    return;
  }
  const { createElement } = await import("react");
  const { NewMessageEmail } = await import("./templates/NewMessage");
  const html = await render(
    createElement(NewMessageEmail, {
      recipientName,
      senderName,
      projectName,
      messagePreview,
      messagesUrl,
      agencyUrl: isPortalUser ? PORTAL_URL : AGENCY_URL,
    }),
  );
  await sendEmail(to, `New message in ${projectName} from ${senderName}`, html);
}

/**
 * Confirms payment was received to the client.
 */
export async function sendPaymentReceivedEmail({
  to,
  invoiceNumber,
  amount,
  currency,
}: {
  to: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
}): Promise<void> {
  if (!isSmtpConfigured()) {
    console.log(`\n[DEV] Payment received — #${invoiceNumber} → ${to}\n`);
    return;
  }
  const { createElement } = await import("react");
  const { PaymentReceived } = await import("./templates/InvoiceEmail");
  const html = await render(createElement(PaymentReceived, { invoiceNumber, amount, currency }));
  await sendEmail(to, `Payment confirmed for invoice ${invoiceNumber}`, html);
}
