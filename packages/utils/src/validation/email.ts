/**
 * Validates an email address format.
 * Uses a practical regex that catches common errors without being overly strict.
 *
 * @param email - Email address to validate
 * @returns true if the email format is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
