import { type To, useHref } from "react-router-dom";

/**
 * A `useHref` function that knows not to prefix routes that are no local
 */
export function useBetterHref(to: To): string {
  const local = useHref(to);
  if (typeof to === "string" && to.startsWith("http")) return to;
  return local;
}
