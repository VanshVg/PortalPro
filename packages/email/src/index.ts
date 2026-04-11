// ============================================
// @portalpro/email — Email Templates & Mailer
// ============================================

// Templates (JSX — import only from Next.js apps that support JSX)
export { VerifyEmail } from "./templates/VerifyEmail";
export { ResetPassword } from "./templates/ResetPassword";
export { TeamInvite } from "./templates/TeamInvite";
export { ClientInvite } from "./templates/ClientInvite";

// Mailer functions (server-safe, no JSX at module level)
export {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendTeamInviteEmail,
  sendClientInviteEmail,
} from "./mailer";
