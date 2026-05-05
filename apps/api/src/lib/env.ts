/**
 * Central environment configuration for the API server.
 * All process.env access must go through this file.
 * Import named constants from here — never use process.env inline elsewhere.
 *
 * dotenv is loaded here so it runs before any other module reads process.env.
 * In production, env vars are injected by the platform (Vercel/Docker) — dotenv is a no-op.
 */
import { config } from "dotenv";
import { resolve } from "path";

// Local dev only: load .env from monorepo root (2 levels up from apps/api/).
// On Vercel/production, env vars are injected by the platform — dotenv is a no-op.
config({ path: resolve(process.cwd(), "../../.env") });

export const NODE_ENV = process.env.NODE_ENV ?? "development";
export const IS_PRODUCTION = NODE_ENV === "production";
export const IS_DEVELOPMENT = NODE_ENV === "development";
// ── Server ──────────────────────────────────────────────────────────────────
export const PORT = Number(process.env.PORT ?? 4000);

// ── Auth ─────────────────────────────────────────────────────────────────────
export const AUTH_SECRET = process.env.AUTH_SECRET;
/**
 * Cookie name for the agency NextAuth v5 session.
 * Must match `cookies.sessionToken.name` in apps/agency/src/auth.ts.
 * In production, the __Secure- prefix is added automatically by browsers for HTTPS cookies,
 * but NextAuth also adds it when `secure: true` — so we mirror that here.
 */
export const AUTH_COOKIE_NAME = IS_PRODUCTION
  ? "__Secure-portalpro.agency.session-token"
  : "portalpro.agency.session-token";

/**
 * Cookie name for the portal NextAuth v5 session.
 * Must match `cookies.sessionToken.name` in apps/portal/src/auth.ts.
 */
export const PORTAL_COOKIE_NAME = IS_PRODUCTION
  ? "__Secure-portalpro.portal.session-token"
  : "portalpro.portal.session-token";

// ── CORS / App URLs ──────────────────────────────────────────────────────────
// NEXT_PUBLIC_AGENCY_URL is the var name in .env (shared with Next.js apps)
export const AGENCY_URL = process.env.AGENCY_URL ?? process.env.NEXT_PUBLIC_AGENCY_URL ?? "http://localhost:3000";
export const PORTAL_URL = process.env.PORTAL_URL ?? process.env.NEXT_PUBLIC_PORTAL_URL ?? "http://localhost:3001";

// ── Cloudflare R2 ────────────────────────────────────────────────────────────
export const R2_BUCKET = process.env.R2_BUCKET ?? "portalpro";
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL ?? "";
export const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
export const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID ?? "";
export const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY ?? "";

// ── Stripe ───────────────────────────────────────────────────────────────────
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? "";
export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";

// ── Logging ──────────────────────────────────────────────────────────────────
export const LOG_LEVEL = process.env.LOG_LEVEL ?? "info";
