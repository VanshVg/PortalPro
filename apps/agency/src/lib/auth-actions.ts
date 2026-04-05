"use server";

import { signIn, signOut } from "@/auth";
import { prisma } from "@portalpro/database";
import { sendVerificationEmail, sendPasswordResetEmail } from "@portalpro/email";
import { hash } from "bcryptjs";
import { AuthError } from "next-auth";
import { randomBytes } from "crypto";
import { redirect } from "next/navigation";

const AGENCY_URL = process.env.AUTH_URL ?? "http://localhost:3000";
const TOKEN_EXPIRY_HOURS = 24;

/**
 * Server action: sign in with credentials.
 * Returns an error object on failure; throws (redirects) on success.
 */
export async function loginAction(
  formData: FormData,
): Promise<{ error: string; unverified?: boolean } | undefined> {
  const email = formData.get("email") as string;

  // Check if user exists but hasn't verified their email
  const user = await prisma.user.findUnique({
    where: { email },
    select: { emailVerified: true },
  });

  if (user && !user.emailVerified) {
    return {
      error: "Please verify your email before signing in.",
      unverified: true,
    };
  }

  try {
    await signIn("credentials", {
      email,
      password: formData.get("password"),
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid email or password." };
        default:
          return { error: "Something went wrong. Please try again." };
      }
    }
    throw error;
  }
  return undefined;
}

/**
 * Server action: create a new agency account.
 * Creates the user + workspace, sends a verification email,
 * then redirects to /verify-email (does NOT sign in yet).
 */
export async function signupAction(
  formData: FormData,
): Promise<{ error: string } | undefined> {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const workspaceName = formData.get("workspaceName") as string;

  if (!name || !email || !password || !workspaceName) {
    return { error: "All fields are required." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with this email already exists." };
  }

  const passwordHash = await hash(password, 12);

  const slug = workspaceName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const slugExists = await prisma.tenant.findUnique({ where: { slug } });
  const finalSlug = slugExists ? `${slug}-${Date.now()}` : slug;

  // Create user + tenant in a transaction
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name, email, passwordHash },
    });
    const tenant = await tx.tenant.create({
      data: { name: workspaceName, slug: finalSlug },
    });
    await tx.tenantMember.create({
      data: { userId: user.id, tenantId: tenant.id, role: "OWNER" },
    });
  });

  // Generate a secure verification token
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  // Delete any existing token for this email and create a new one
  await prisma.verificationToken.deleteMany({ where: { identifier: email } });
  await prisma.verificationToken.create({
    data: { identifier: email, token, expires },
  });

  // Send (or log in dev mode) the verification email
  const verifyUrl = `${AGENCY_URL}/api/auth/verify?token=${token}&email=${encodeURIComponent(email)}`;
  await sendVerificationEmail({ to: email, userName: name, verifyUrl });

  // Redirect to the "check your inbox" page — do NOT sign in yet
  redirect(`/verify-email?email=${encodeURIComponent(email)}`);
}

/**
 * Server action: resend the verification email.
 */
export async function resendVerificationAction(
  email: string,
): Promise<{ error?: string; success?: boolean }> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { name: true, emailVerified: true },
  });

  if (!user) return { error: "No account found for this email." };
  if (user.emailVerified) return { error: "This email is already verified." };

  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  await prisma.verificationToken.deleteMany({ where: { identifier: email } });
  await prisma.verificationToken.create({
    data: { identifier: email, token, expires },
  });

  const verifyUrl = `${AGENCY_URL}/api/auth/verify?token=${token}&email=${encodeURIComponent(email)}`;
  await sendVerificationEmail({ to: email, userName: user.name, verifyUrl });

  return { success: true };
}

/**
 * Server action: send a password reset email.
 * Always returns success (doesn't reveal whether the email exists).
 */
export async function forgotPasswordAction(
  formData: FormData,
): Promise<{ error?: string; success?: boolean }> {
  const email = formData.get("email") as string;
  if (!email) return { error: "Email is required." };

  const user = await prisma.user.findUnique({
    where: { email },
    select: { name: true, emailVerified: true },
  });

  // Don't reveal if the account exists — silently succeed
  if (!user || !user.emailVerified) return { success: true };

  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.verificationToken.deleteMany({ where: { identifier: `reset:${email}` } });
  await prisma.verificationToken.create({
    data: { identifier: `reset:${email}`, token, expires },
  });

  const resetUrl = `${AGENCY_URL}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
  await sendPasswordResetEmail({ to: email, userName: user.name, resetUrl });

  return { success: true };
}

/**
 * Server action: validate reset token and update the user's password.
 */
export async function resetPasswordAction(
  formData: FormData,
): Promise<{ error?: string } | undefined> {
  const email = formData.get("email") as string;
  const token = formData.get("token") as string;
  const password = formData.get("password") as string;

  if (!email || !token || !password) return { error: "Missing required fields." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const record = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!record || record.identifier !== `reset:${email}`) {
    return { error: "This reset link is invalid." };
  }

  if (record.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { token } });
    return { error: "This reset link has expired. Please request a new one." };
  }

  const passwordHash = await hash(password, 12);

  await prisma.$transaction([
    prisma.user.update({ where: { email }, data: { passwordHash } }),
    prisma.verificationToken.delete({ where: { token } }),
  ]);

  redirect("/login?reset=true");
}

/**
 * Server action: sign out and redirect to login.
 */
export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
