import { useCallback, useSyncExternalStore } from "react";

type Listener = () => void;

const userModerationStore = new Map<
  string,
  {
    listeners: Listener[];
    value?: "allow" | "deny";
  }
>();

export function useUserModeration(cid: string) {
  const subscribe = useCallback(
    (listener: Listener) => {
      let entry = userModerationStore.get(cid);
      if (entry === undefined) {
        entry = { listeners: [] };
        userModerationStore.set(cid, entry);
      }

      entry.listeners.push(listener);

      return () => {
        entry.listeners = entry.listeners.filter((l) => l !== listener);
      };
    },
    [cid],
  );

  const getSnapshot = useCallback(() => {
    return userModerationStore.get(cid)?.value;
  }, [cid]);

  const setValue = useCallback(
    (value: "allow" | "deny") => {
      let entry = userModerationStore.get(cid);
      if (entry === undefined) {
        entry = { listeners: [] };
        userModerationStore.set(cid, entry);
      }
      entry.value = value;

      for (const listener of entry.listeners) {
        listener();
      }
    },
    [cid],
  );

  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return [value, setValue] as const;
}
