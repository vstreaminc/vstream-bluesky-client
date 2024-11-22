import { $path } from "remix-routes";
import { handleOrDid } from "./utils";

export function linkToProfile<T extends { handle: string; did: string }>(
  author: T,
): string {
  return $path("/c/:handle", { handle: handleOrDid(author) });
}

export function linkToPost<
  T extends { rkey: string; author: { handle: string; did: string } },
>(post: T): string {
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

  return new URL(
    `${url.pathname}${paramsString}`,
    `https://${url.host}`,
  ).toString();
}
