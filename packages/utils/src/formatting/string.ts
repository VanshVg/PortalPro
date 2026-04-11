/**
 * Truncates a string to the specified length, appending "..." if truncated.
 *
 * @param str - Input string
 * @param maxLength - Maximum length before truncation (default: 100)
 * @returns Truncated string or original if within limit
 */
export function truncate(str: string, maxLength = 100): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

/**
 * Converts a string to a URL-safe slug.
 * Lowercases, replaces spaces with hyphens, removes special characters.
 *
 * @param str - Input string (e.g., "My Agency Name")
 * @returns URL slug (e.g., "my-agency-name")
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Capitalizes the first letter of a string.
 *
 * @param str - Input string
 * @returns Capitalized string
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Formats a byte count into a human-readable string (e.g., "1.4 MB").
 *
 * @param bytes - Number of bytes
 * @param decimals - Number of decimal places (default: 1)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}
