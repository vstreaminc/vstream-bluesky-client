import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";

type ShadowImage = Partial<{
  width: number;
  height: number;
}>;

type Listener = () => void;

const imageDb = new Map<
  string,
  {
    listeners: Listener[];
    overrides: ShadowImage;
  }
>();

/**
 * Sometimes we don't know everything about an image from the server. In those
 * instances we save the missing information locally so we can augment the
 * image with the new informaton at render time.
 */
export function useImageShadows(_keys: string | string[]) {
  const keys = Array.from(_keys);
  const memoRef = useRef<ShadowImage[] | null>(null);

  const recalculate = useCallback(() => {
    return keys.map((key) => imageDb.get(key)?.overrides ?? {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, keys);

  const subscribe = useCallback(
    (listener: Listener) => {
      const compoundListener: Listener = () => {
        memoRef.current = recalculate();
        listener();
      };

      for (const key of keys) {
        let db = imageDb.get(key);
        if (db === undefined) {
          db = { listeners: [], overrides: {} };
          imageDb.set(key, db);
        }
        db.listeners.push(compoundListener);
      }

      return () => {
        for (const key of keys) {
          const db = imageDb.get(key);
          if (db === undefined) continue;
          db.listeners = db.listeners.filter((l) => l !== compoundListener);
        }
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [...keys, recalculate],
  );

  const getSnapshot = useCallback(() => {
    if (memoRef.current) return memoRef.current;
    const value = recalculate();
    memoRef.current = value;
    return value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...keys, recalculate]);

  useEffect(() => {
    memoRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, keys);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useUpdateImageShadow(key: string) {
  return useCallback(
    (value: ShadowImage) => {
      const db = imageDb.get(key);
      if (!db) return;
      db.overrides = value;
      for (const listener of db.listeners) {
        listener();
      }
    },
    [key],
  );
}
