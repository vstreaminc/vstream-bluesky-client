export const DEFAULT_LOCALE = "en-US" as const;
export const SUPPORTED_LOCALES = [
  "en",
  "en-US",
  "en-GB",
  "es",
  "es-ES",
  "ja",
  "ja-JP",
  "ko",
  "ko-KR",
] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export function isSupportedLocale(locale: string): locale is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(locale);
}

/**
 * Generates a link to a locale given a certain existing URL
 */
export function linkToLocale(url: URL, locale: string | null): URL {
  const clone = new URL(url);
  if (locale) {
    clone.searchParams.set("lang", locale);
  } else {
    clone.searchParams.delete("lang");
  }
  return clone;
}
