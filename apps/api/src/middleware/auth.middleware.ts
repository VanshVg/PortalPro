import type { Request, Response, NextFunction } from "express";
import { hkdf } from "@panva/hkdf";
import { jwtDecrypt, base64url, calculateJwkThumbprint } from "jose";
import { parse as parseCookies } from "cookie";
import { UnauthorizedError } from "@portalpro/types";
import { AUTH_SECRET, AUTH_COOKIE_NAME } from "../lib/env";

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

/**
 * Pre-computed encryption keys cached at module load time.
 * HKDF + JWK thumbprint are expensive; doing them once avoids per-request crypto overhead.
 * Keys are keyed by enc algorithm so we handle both A256CBC-HS512 and A256GCM.
 */
interface CachedKey {
  key: Uint8Array;
  thumbprint: string;
}
const keyCache = new Map<string, Promise<CachedKey>>();

function getCachedKey(enc: string, secret: string, salt: string): Promise<CachedKey> {
  const cacheKey = `${enc}:${salt}`;
  let cached = keyCache.get(cacheKey);
  if (!cached) {
    cached = (async () => {
      const length = enc === "A256GCM" ? 32 : 64; // A256CBC-HS512 is the NextAuth v5 default
      const key = await hkdf(
        "sha256",
        secret,
        salt,
        `Auth.js Generated Encryption Key (${salt})`,
        length,
      );
      const thumbprint = await calculateJwkThumbprint(
        { kty: "oct", k: base64url.encode(key) },
        `sha${key.byteLength << 3}` as "sha256" | "sha384" | "sha512",
      );
      return { key, thumbprint };
    })();
    keyCache.set(cacheKey, cached);
  }
  return cached;
}

// Warm up the cache at module load if AUTH_SECRET is already available
if (AUTH_SECRET) {
  void getCachedKey("A256CBC-HS512", AUTH_SECRET, AUTH_COOKIE_NAME);
}

/**
 * Decodes a NextAuth v5 JWE session token.
 * Uses a key-selector function so the correct key is chosen even if the
 * enc algorithm changes, matching @auth/core's decode() implementation.
 * Encryption keys are cached after first derivation to avoid per-request HKDF overhead.
 */
async function decodeNextAuthToken(
  token: string,
  secret: string,
  salt: string,
) {
  const { payload } = await jwtDecrypt(
    token,
    async ({ kid, enc }) => {
      const { key, thumbprint } = await getCachedKey(enc ?? "A256CBC-HS512", secret, salt);
      if (kid === undefined) return key;
      if (kid === thumbprint) return key;
      throw new Error("No matching decryption secret");
    },
    {
      clockTolerance: 15,
      keyManagementAlgorithms: ["dir"],
      contentEncryptionAlgorithms: ["A256CBC-HS512", "A256GCM"],
    },
  );
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
  const secret = AUTH_SECRET;
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
    rawToken = cookies[AUTH_COOKIE_NAME];
  }

  if (!rawToken) {
    next(new UnauthorizedError("No session token provided"));
    return;
  }

  try {
    const payload = await decodeNextAuthToken(rawToken, secret, AUTH_COOKIE_NAME);

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
