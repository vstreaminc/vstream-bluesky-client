import type express from "express";
import { parseAcceptLanguage } from "intl-parse-accept-language";
import {
  DEFAULT_LOCALE,
  isSupportedLocale,
  type SupportedLocale,
} from "~/lib/locale";
import type { AppContext } from "./context/appContext";

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
