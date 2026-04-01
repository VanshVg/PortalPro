/**
 * Supported currency codes with display names.
 * International-first: GBP, EUR, USD, AED as specified in the project requirements.
 */
export const SUPPORTED_CURRENCIES = [
  { code: "GBP", name: "British Pound", symbol: "£", locale: "en-GB" },
  { code: "EUR", name: "Euro", symbol: "€", locale: "de-DE" },
  { code: "USD", name: "US Dollar", symbol: "$", locale: "en-US" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", locale: "ar-AE" },
] as const;

/**
 * Supported locales for date/number formatting.
 */
export const SUPPORTED_LOCALES = [
  { code: "en-GB", name: "English (UK)", dir: "ltr" },
  { code: "en-US", name: "English (US)", dir: "ltr" },
  { code: "de-DE", name: "German", dir: "ltr" },
  { code: "fr-FR", name: "French", dir: "ltr" },
  { code: "ar-AE", name: "Arabic (UAE)", dir: "rtl" },
] as const;

/** Maximum file upload size: 50MB in bytes. */
export const MAX_FILE_SIZE = 50 * 1024 * 1024;
