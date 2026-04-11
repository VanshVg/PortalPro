import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@portalpro/database";
import { hash } from "bcryptjs";

/**
 * POST /api/auth/accept-invite
 * Validates the invite token, sets the user's password, marks email as verified.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = (await req.json()) as { token?: string; email?: string; password?: string };
  const { token, email, password } = body;

  if (!token || !email || !password) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const record = await prisma.verificationToken.findUnique({ where: { token } });

  if (!record || record.identifier !== `team-invite:${email}`) {
    return NextResponse.json({ error: "Invalid invitation link" }, { status: 400 });
  }

  if (record.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { token } });
    return NextResponse.json({ error: "This invitation has expired" }, { status: 400 });
  }

  const passwordHash = await hash(password, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { email },
      data: {
        passwordHash,
        emailVerified: new Date(),
      },
    }),
    prisma.verificationToken.delete({ where: { token } }),
  ]);

  return NextResponse.json({ success: true });
}
