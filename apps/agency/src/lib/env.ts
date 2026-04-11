/**
 * Central environment configuration for the Agency app.
 * All process.env access must go through this file.
 * Import named constants from here — never use process.env inline elsewhere.
 */

export const NODE_ENV = process.env.NODE_ENV ?? "development";
export const IS_PRODUCTION = NODE_ENV === "production";

// ── App URLs ─────────────────────────────────────────────────────────────────
/** The canonical URL of this Next.js app (used for email links, redirects). */
export const AGENCY_URL = process.env.AUTH_URL ?? "http://localhost:3000";

// ── API ───────────────────────────────────────────────────────────────────────
/** Base URL of the Express API server. Must be a NEXT_PUBLIC_ var for client components. */
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
