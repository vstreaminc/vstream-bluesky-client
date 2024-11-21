import * as React from "react";
import type { CacheSnapshot, WindowVirtualizerHandle } from "virtua";

const virtCache = new Map<string, CacheSnapshot>();

export function useWindowVirtualizeCached(cacheKey: string): {
  cache: CacheSnapshot | undefined;
  ref: React.RefObject<WindowVirtualizerHandle>;
} {
  const ref = React.useRef<WindowVirtualizerHandle>(null);
  const cache = virtCache.get(cacheKey);

  React.useLayoutEffect(() => {
    const handle = ref.current;
    if (!handle) return;
    return () => {
      virtCache.set(cacheKey, handle.cache);
    };
  }, [cacheKey]);

  return { ref, cache };
}
