/**
 * Server-only mailer exports — no React/JSX imports at module level.
 * This is the entry point for the API server, which is not configured for JSX.
 */
export {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendTeamInviteEmail,
  sendClientInviteEmail,
} from "./mailer";
