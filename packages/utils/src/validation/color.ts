/**
 * Validates that a string is a valid hex color code.
 * Accepts both 3-digit and 6-digit formats with or without #.
 *
 * @param color - Color string to validate (e.g., "#1B4D6E", "1B4D6E", "#FFF")
 * @returns true if the color is a valid hex code
 */
export function isValidHexColor(color: string): boolean {
  const hexRegex = /^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
  return hexRegex.test(color);
}
