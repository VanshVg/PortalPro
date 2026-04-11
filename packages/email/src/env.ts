/**
 * Central environment configuration for the email package.
 * All process.env access must go through this file.
 */

// ── SMTP ─────────────────────────────────────────────────────────────────────
export const SMTP_HOST = process.env.SMTP_HOST ?? "smtp.gmail.com";
export const SMTP_PORT = Number(process.env.SMTP_PORT ?? 587);
export const SMTP_USER = process.env.SMTP_USER;
export const SMTP_PASS = process.env.SMTP_PASS;
export const SMTP_FROM = process.env.SMTP_FROM ?? "PortalPro <noreply@portalpro.app>";

// ── App URLs ─────────────────────────────────────────────────────────────────
/** Canonical agency app URL — used in email links. */
export const AGENCY_URL = process.env.AUTH_URL ?? "http://localhost:3000";
