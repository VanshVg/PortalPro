import type { Request, Response, NextFunction } from "express";
import { hkdf } from "@panva/hkdf";
import { jwtDecrypt } from "jose";
import { parse as parseCookies } from "cookie";
import { UnauthorizedError } from "@portalpro/types";

// Extend Express Request to carry session user
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        tenantId: string | null;
        role: string | null;
      };
    }
  }
}

const COOKIE_NAME =
  process.env.NODE_ENV === "production"
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

/**
 * Derives the encryption key from AUTH_SECRET using HKDF,
 * matching NextAuth v5's key derivation strategy.
 */
async function deriveEncryptionKey(secret: string): Promise<Uint8Array> {
  return hkdf(
    "sha256",
    secret,
    "",
    "Auth.js Generated Encryption Key",
    64,
  );
}

/**
 * Decodes a NextAuth v5 JWE session token.
 */
async function decodeNextAuthToken(token: string, secret: string) {
  const encryptionKey = await deriveEncryptionKey(secret);
  const { payload } = await jwtDecrypt(token, encryptionKey, {
    clockTolerance: 15,
  });
  return payload;
}

/**
 * Express middleware that verifies the NextAuth session cookie and
 * attaches the decoded user to `req.user`.
 *
 * Supports both cookie-based auth (same-origin requests from the
 * Next.js app) and Bearer token auth (for future mobile/API clients).
 */
export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    next(new Error("AUTH_SECRET is not configured"));
    return;
  }

  let rawToken: string | undefined;

  // 1. Try Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    rawToken = authHeader.slice(7);
  }

  // 2. Fall back to session cookie
  if (!rawToken) {
    const cookieHeader = req.headers.cookie ?? "";
    const cookies = parseCookies(cookieHeader);
    rawToken = cookies[COOKIE_NAME];
  }

  if (!rawToken) {
    next(new UnauthorizedError("No session token provided"));
    return;
  }

  try {
    const payload = await decodeNextAuthToken(rawToken, secret);

    req.user = {
      id: (payload["id"] as string) ?? (payload["sub"] as string),
      email: payload["email"] as string,
      name: payload["name"] as string,
      tenantId: (payload["tenantId"] as string | null) ?? null,
      role: (payload["role"] as string | null) ?? null,
    };

    next();
  } catch {
    next(new UnauthorizedError("Invalid or expired session"));
  }
}

/**
 * Convenience: require a minimum role level.
 * Must be used after authMiddleware.
 */
export function requireRole(minimumRole: string) {
  const hierarchy: Record<string, number> = {
    OWNER: 40,
    ADMIN: 30,
    EDITOR: 20,
    VIEWER: 10,
  };

  return (req: Request, _res: Response, next: NextFunction) => {
    const role = req.user?.role ?? "VIEWER";
    if ((hierarchy[role] ?? 0) < (hierarchy[minimumRole] ?? 0)) {
      next(new UnauthorizedError(`Requires ${minimumRole} role or higher`));
      return;
    }
    next();
  };
}
