/**
 * Central environment configuration for the Portal app.
 * All process.env access must go through this file.
 * Import named constants from here — never use process.env inline elsewhere.
 */

export const NODE_ENV = process.env.NODE_ENV ?? "development";
export const IS_PRODUCTION = NODE_ENV === "production";

/** The canonical URL of this Next.js portal app. */
export const PORTAL_URL = process.env.PORTAL_URL ?? process.env.NEXT_PUBLIC_PORTAL_URL ?? "http://localhost:3001";

/** Base URL of the Express API server. */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// R2 / Cloudflare Storage (server-side only — used for presigned download URLs)
export const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID ?? "";
export const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID ?? "";
export const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY ?? "";
export const R2_BUCKET = process.env.R2_BUCKET ?? "portalpro";
export const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL ?? "";
