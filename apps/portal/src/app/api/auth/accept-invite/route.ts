import { NextResponse } from "next/server";
import { prisma } from "@portalpro/database";
import { hash } from "bcryptjs";

/**
 * POST /api/auth/accept-invite
 *
 * Validates the client portal invite token, sets the user's password,
 * marks the ClientPortalAccess as accepted, and deletes the used token.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      token?: string;
      email?: string;
      portalId?: string;
      password?: string;
    };

    const { token, email, portalId, password } = body;

    if (!token || !email || !portalId || !password) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const identifier = `client-invite:${email}:${portalId}`;

    // Validate the token
    const record = await prisma.verificationToken.findUnique({
      where: { identifier_token: { identifier, token } },
    });

    if (!record) {
      return NextResponse.json({ error: "Invalid or already used invitation link." }, { status: 400 });
    }
    if (record.expires < new Date()) {
      return NextResponse.json({ error: "This invitation link has expired." }, { status: 400 });
    }

    // Find the user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const passwordHash = await hash(password, 12);

    // Set password + mark email verified + mark access as accepted in one transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          emailVerified: new Date(),
        },
      }),
      prisma.clientPortalAccess.updateMany({
        where: { clientPortalId: portalId, userId: user.id },
        data: { acceptedAt: new Date() },
      }),
      prisma.verificationToken.delete({
        where: { identifier_token: { identifier, token } },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
