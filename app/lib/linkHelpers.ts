import { $path } from "safe-routes";
import { handleOrDid } from "./utils";
import { SUPPORTED_LOCALES } from "./locale";

export function linkToProfile<T extends { handle: string; did: string }>(author: T): string {
  return $path("/c/:handle", { handle: handleOrDid(author) });
}

export function linkToPost<T extends { rkey: string; author: { handle: string; did: string } }>(
  post: T,
): string {
  return $path("/c/:handle/p/:rkey", {
    handle: handleOrDid(post.author),
    rkey: post.rkey,
  });
}

/**
 * Generates a canonical URL that will be used by search engines for this page
 *
 * @remarks
 * Canonical URLs are useful as it help search engines understand what's
 * important in URLs vs what is just fluff or tracking information. All urls
 * that share the same canonical URL will share the same link equity.
 */
export function canonicalURL(
  urlString: string,
  locale: string,
  /**
   * A list of params to include in the canonical URL. By default all params
   * are stripped. Any param that changes the shape of the page should be
   * included. I.E. The "q" param on the search page
   */
  includeParams: string[] = [],
): string {
  const url = new URL(urlString);
  const params = new URLSearchParams();

  switch (locale) {
    case "en":
    case "en-US": {
      // Instead of linking to english tags, use root instead
      break;
    }
    default:
      params.set("lang", locale);
  }

  for (const param of includeParams) {
    const val = url.searchParams.get(param);
    if (val) params.set(param, val);
  }

  let paramsString = params.toString();
  if (paramsString !== "") {
    paramsString = "?" + paramsString;
  }

  return new URL(`${url.pathname}${paramsString}`, `https://${url.host}`).toString();
}

/**
 * Generates a link to a locale given a certain existing URL
 */
export function linkToLocale(url: URL | string, locale: string | null): URL {
  const clone = new URL(url);
  if (locale) {
    clone.searchParams.set("lang", locale);
  } else {
    clone.searchParams.delete("lang");
  }
  return clone;
}

/**
 * Add links to alternative locales
 * https://developers.google.com/search/docs/specialty/international/localized-versions
 */
export function hrefLangs(url: string): { locale: string; href: string }[] {
  return SUPPORTED_LOCALES.map((locale): { locale: string; href: string } => ({
    locale,
    href: linkToLocale(url, locale).toString(),
  })).concat({
    locale: "x-default",
    href: linkToLocale(url, null).toString(),
  });
}
