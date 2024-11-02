import type express from "express";
import { parseAcceptLanguage } from "intl-parse-accept-language";
import type { AppContext } from "../../server/context/appContext";

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

export async function extractCurrentLocale(
  request: express.Request | Request,
  ctx: AppContext,
): Promise<SupportedLocale> {
  // 1. Get from ?lang= query param
  const langParam =
    request instanceof Request
      ? new URLSearchParams(request.url.split("?")[1]).get("lang")
      : (request.query.lang as string | null);
  if (langParam && isSupportedLocale(langParam)) return langParam;

  // 2. Get from session
  const cookie =
    request instanceof Request
      ? request.headers.get("Cookie")
      : (request.get("Cookie") ?? null);
  const session = await ctx.session.getFromCookie(cookie);
  const sessionLocale = session.get("locale");
  if (sessionLocale) return sessionLocale;

  // 3. Get from Accept-Language header
  const acceptLang =
    request instanceof Request
      ? request.headers.get("Accept-Language")
      : (request.get("Accept-Language") as string | null);
  const acceptedLocales = parseAcceptLanguage(acceptLang, {
    validate: (l) => (isSupportedLocale(l) ? l : null),
  }) as SupportedLocale[];
  if (acceptedLocales.length > 0) return acceptedLocales[0];

  // 4. Finally, return the default locale
  return DEFAULT_LOCALE;
}
