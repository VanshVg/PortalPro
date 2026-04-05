import { prisma } from "@portalpro/database";
import { type NextRequest, NextResponse } from "next/server";

/**
 * GET /api/auth/verify?token=xxx&email=yyy
 *
 * Validates the email verification token, marks the user as verified,
 * then redirects to /login?verified=true.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const loginUrl = new URL("/login", request.url);

  if (!token || !email) {
    loginUrl.searchParams.set("error", "invalid-link");
    return NextResponse.redirect(loginUrl);
  }

  // Look up the token
  const record = await prisma.verificationToken.findFirst({
    where: { identifier: email, token },
  });

  if (!record) {
    loginUrl.searchParams.set("error", "invalid-link");
    return NextResponse.redirect(loginUrl);
  }

  // Check expiry
  if (record.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { token: record.token } });
    loginUrl.searchParams.set("error", "link-expired");
    loginUrl.searchParams.set("email", email);
    return NextResponse.redirect(loginUrl);
  }

  // Mark email as verified
  await prisma.user.update({
    where: { email },
    data: { emailVerified: new Date() },
  });

  // Clean up the token
  await prisma.verificationToken.delete({ where: { token: record.token } });

  // Redirect to login with success flag
  loginUrl.searchParams.set("verified", "true");
  return NextResponse.redirect(loginUrl);
}
