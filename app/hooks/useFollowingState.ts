import { useCallback, useSyncExternalStore } from "react";

type Listener = () => void;

const followingDB = new Map<
  string,
  {
    listeners: Listener[];
    value: boolean;
  }
>();

export function useFollowingState(
  did: string,
  fallback: boolean,
): [boolean, (updateFollowing: boolean) => void] {
  const subscribe = useCallback(
    (listener: Listener) => {
      let db = followingDB.get(did);
      if (db === undefined) {
        db = { listeners: [], value: fallback };
        followingDB.set(did, db);
      }
      db.listeners.push(listener);

      return () => {
        db.listeners = db.listeners.filter((l) => l !== listener);
      };
    },
    [did, fallback],
  );

  const getSnapshot = useCallback(() => {
    return followingDB.get(did)?.value ?? fallback;
  }, [did, fallback]);

  const serverSnapshot = useCallback(() => fallback, [fallback]);

  const updateStore = useCallback(
    (updatedValue: boolean) => {
      const db = followingDB.get(did);
      if (!db) return;

      db.value = updatedValue;
      for (const listener of db.listeners) {
        listener();
      }
    },
    [did],
  );

  const isFollowing = useSyncExternalStore(subscribe, getSnapshot, serverSnapshot);
  return [isFollowing, updateStore];
}
