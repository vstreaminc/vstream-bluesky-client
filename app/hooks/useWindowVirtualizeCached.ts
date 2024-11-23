import * as React from "react";
import type { CacheSnapshot, WindowVirtualizerHandle } from "virtua";
import { useIsomorphicLayoutEffect } from "./useIsomorphicLayoutEffect";

const virtCache = new Map<string, { state: string; cache: CacheSnapshot }>();

export function useWindowVirtualizeCached(
  cacheKey: string,
  state: string,
): {
  cache: CacheSnapshot | undefined;
  ref: React.RefObject<WindowVirtualizerHandle>;
} {
  const ref = React.useRef<WindowVirtualizerHandle>(null);
  const cached = virtCache.get(cacheKey);

  useIsomorphicLayoutEffect(() => {
    const handle = ref.current;
    if (!handle) return;
    return () => {
      virtCache.set(cacheKey, { state, cache: handle.cache });
    };
  }, [state, cacheKey]);

  React.useEffect(() => {
    if (!cached) return;
    if (cached.state !== state) virtCache.delete(cacheKey);
  }, [cacheKey, cached, state]);

  const toReturn = React.useMemo(
    () => ({
      ref,
      cache: cached?.state === state ? cached?.cache : undefined,
    }),
    [state, ref, cached],
  );

  return toReturn;
}
