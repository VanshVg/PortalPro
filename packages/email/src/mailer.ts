import nodemailer from "nodemailer";
import { createElement } from "react";
import { render } from "@react-email/components";
import { VerifyEmail } from "./templates/VerifyEmail";
import { ResetPassword } from "./templates/ResetPassword";

/**
 * Creates a Nodemailer transporter from environment variables.
 * Requires: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 */
function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: false, // STARTTLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

const FROM_ADDRESS = process.env.SMTP_FROM ?? "PortalPro <noreply@portalpro.app>";

/**
 * Returns true when all required SMTP env vars are present.
 */
function isSmtpConfigured(): boolean {
  console.log(process.env.SMTP_USER, process.env.SMTP_PASS, ">>>>>>>>>>>>>>>>>>>>")
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

/**
 * Sends the email verification link to a new user.
 * In development (no SMTP credentials), logs the link to the console instead.
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
  const agencyUrl = process.env.AUTH_URL ?? "http://localhost:3000";

  // Dev mode: log instead of sending
  if (!isSmtpConfigured()) {
    console.log("\n[DEV] Verification email — would send to:", to);
    console.log("   Link:", verifyUrl, "\n");
    return;
  }

  const html = await render(createElement(VerifyEmail, { userName, verifyUrl, agencyUrl }));
  const transporter = createTransporter();

  console.log("Sending email to:", {
    from: FROM_ADDRESS,
    to,
    subject: "Verify your PortalPro email address",
    html,
  });

  await transporter.sendMail({
    from: FROM_ADDRESS,
    to,
    subject: "Verify your PortalPro email address",
    html,
  });
}

/**
 * Sends a password reset link to an existing user.
 * In development (no SMTP credentials), logs the link to the console instead.
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
  const agencyUrl = process.env.AUTH_URL ?? "http://localhost:3000";

  if (!isSmtpConfigured()) {
    console.log("\n[DEV] Password reset email — would send to:", to);
    console.log("   Link:", resetUrl, "\n");
    return;
  }

  const html = await render(createElement(ResetPassword, { userName, resetUrl, agencyUrl }));
  const transporter = createTransporter();

  await transporter.sendMail({
    from: FROM_ADDRESS,
    to,
    subject: "Reset your PortalPro password",
    html,
  });
}
