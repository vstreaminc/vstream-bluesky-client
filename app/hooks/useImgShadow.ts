import * as React from "react";

type ShadowImage = Partial<{
  width: number;
  height: number;
}>;

const db = new Map<string, ShadowImage>();

/**
 * Sometimes we don't know everything about an image from the server. In those
 * instances we save the missing information locally so we can augment the
 * image with the new informaton at render time.
 */
export function useImageShadows() {
  const [, reset] = React.useState(Date.now());

  const lookup = (url: string): ShadowImage => db.get(url) ?? {};
  const set = (url: string, overrides: ShadowImage) => {
    db.set(url, overrides);
    reset(Date.now());
  };

  return [lookup, set] as [typeof lookup, typeof set];
}
