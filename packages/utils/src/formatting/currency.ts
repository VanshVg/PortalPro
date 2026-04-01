/**
 * Formats a monetary amount with locale-aware currency symbol and separators.
 *
 * Uses `Intl.NumberFormat` internally. For currencies without minor units
 * (e.g., JPY), decimal places are omitted automatically.
 *
 * @param amount - The numeric amount to format (e.g., 1234.56)
 * @param currency - ISO 4217 currency code (e.g., "GBP", "EUR", "AED")
 * @param locale - BCP 47 locale string (e.g., "en-GB", "ar-AE")
 * @returns Formatted currency string (e.g., "£1,234.56", "1.234,56 €")
 *
 * @example
 * formatCurrency(1234.56, "GBP", "en-GB") // "£1,234.56"
 * formatCurrency(1234.56, "EUR", "de-DE") // "1.234,56 €"
 * formatCurrency(1234, "JPY", "ja-JP")    // "¥1,234"
 */
export function formatCurrency(amount: number, currency: string, locale = "en-US"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
}

/**
 * Parses a user-typed currency string into a numeric value.
 * Strips currency symbols, spaces, and thousand separators.
 *
 * @param input - Raw user input (e.g., "£1,234.56", "1.234,56")
 * @returns Parsed number or NaN if unparseable
 */
export function parseCurrencyInput(input: string): number {
  const cleaned = input.replace(/[^0-9.,\-]/g, "");
  // Handle European format (1.234,56) vs US format (1,234.56)
  const hasCommaDecimal = /,\d{1,2}$/.test(cleaned);
  if (hasCommaDecimal) {
    return parseFloat(cleaned.replace(/\./g, "").replace(",", "."));
  }
  return parseFloat(cleaned.replace(/,/g, ""));
}
