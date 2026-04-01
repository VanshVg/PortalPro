/**
 * Formats a date for display using locale-aware formatting.
 *
 * @param date - Date object or ISO string
 * @param locale - BCP 47 locale (defaults to "en-GB" for international format)
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string (e.g., "31 Mar 2026")
 */
export function formatDate(
  date: Date | string,
  locale = "en-GB",
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" },
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, options).format(d);
}

/**
 * Returns a human-readable relative time string.
 *
 * @param date - Date object or ISO string
 * @param locale - BCP 47 locale (defaults to "en")
 * @returns Relative time string (e.g., "2 hours ago", "in 3 days")
 */
export function formatRelativeTime(date: Date | string, locale = "en"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (Math.abs(diffSec) < 60) return rtf.format(diffSec, "second");
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
  if (Math.abs(diffHour) < 24) return rtf.format(diffHour, "hour");
  if (Math.abs(diffDay) < 30) return rtf.format(diffDay, "day");

  return formatDate(d, locale);
}

/**
 * Converts a Date to an ISO date string (YYYY-MM-DD).
 *
 * @param date - Date object
 * @returns ISO date string (e.g., "2026-03-31")
 */
export function toISODate(date: Date): string {
  return date.toISOString().split("T")[0]!;
}
