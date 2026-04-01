/**
 * Validates that a string is a valid URL slug.
 * Must be lowercase, alphanumeric with hyphens, 3-63 characters.
 *
 * @param slug - Slug string to validate
 * @returns true if the slug is valid
 */
export function isValidSlug(slug: string): boolean {
  const slugRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
  return slug.length >= 3 && slug.length <= 63 && slugRegex.test(slug);
}

/**
 * Sanitizes a string into a valid slug.
 * Removes invalid characters and enforces length limits.
 *
 * @param input - Raw input string
 * @returns Sanitized slug
 */
export function sanitizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 63);
}
