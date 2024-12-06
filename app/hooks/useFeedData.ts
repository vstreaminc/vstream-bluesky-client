import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { $path } from "remix-routes";
import { useFetcher } from "@remix-run/react";
import { useEvent } from "react-use-event-hook";
import type { VStreamFeedViewPostSlice } from "~/types";
import type { loader } from "~/routes/api.feed.$feed";

type Listener = () => void;

const feedsDb = new Map<
  string,
  {
    listeners: Listener[];
    value?: {
      cursor?: string;
      slices: VStreamFeedViewPostSlice[];
    };
  }
>();

export function loadFeed(name: string) {
  return feedsDb.get(name);
}

export function prependToFeed(name: string, slices: VStreamFeedViewPostSlice[], cursor?: string) {
  let db = loadFeed(name);
  if (db === undefined) {
    db = { listeners: [] };
    feedsDb.set(name, db);
  }
  db.value = {
    slices: db.value ? mergeSlices(db.value.slices, slices) : slices,
    // Only set if not already set
    cursor: db.value?.cursor ?? cursor,
  };

  for (const listener of db.listeners) {
    listener();
  }

  return db;
}

export function appendToFeed(name: string, slices: VStreamFeedViewPostSlice[], cursor?: string) {
  let db = loadFeed(name);
  if (db === undefined) {
    db = { listeners: [] };
    feedsDb.set(name, db);
  }
  db.value = {
    slices: db.value ? db.value.slices.concat(slices) : slices,
    cursor: cursor ?? db.value?.cursor,
  };

  for (const listener of db.listeners) {
    listener();
  }

  return db;
}

export function useFeedData(
  name: string,
  initialSlices: VStreamFeedViewPostSlice[],
  initialCursor?: string,
): { slices: VStreamFeedViewPostSlice[]; loadMore: () => void } {
  const initial = useMemo(
    () => ({
      slices: initialSlices,
      cursor: initialCursor,
    }),
    [initialSlices, initialCursor],
  );

  useEffect(() => {
    prependToFeed(name, initial.slices, initial.cursor);
  }, [name, initial]);

  const subscribe = useCallback(
    (listener: Listener) => {
      let db = feedsDb.get(name);
      if (db === undefined) {
        db = { listeners: [] };
        feedsDb.set(name, db);
      }
      db.listeners.push(listener);
      return () => {
        db.listeners = db.listeners.filter((l) => l !== listener);
      };
    },
    [name],
  );
  const getSnapshot = useCallback(() => {
    return feedsDb.get(name)?.value;
  }, [name]);
  const { slices, cursor } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot) ?? initial;

  const { data, load } = useFetcher<typeof loader>({ key: `feed-${name}` });
  useEffect(() => {
    if (!data) return;
    appendToFeed(name, data.slices, data.cursor);
  }, [name, data]);
  const loadMore = useEvent(() => {
    load($path("/api/feed/:feed", { feed: name }, { cursor }));
  });

  return useMemo(
    () => ({
      slices,
      loadMore,
    }),
    [slices, loadMore],
  );
}

function mergeSlices(
  cachedSlices: VStreamFeedViewPostSlice[],
  incomingSlices: VStreamFeedViewPostSlice[],
): VStreamFeedViewPostSlice[] {
  const toReturn: VStreamFeedViewPostSlice[] = [];
  let cachedIdx = 0;
  for (let idx = 0; idx < incomingSlices.length; idx++) {
    const cached = cachedSlices[cachedIdx];
    const incoming = incomingSlices[idx];

    // If match, it's a duplicate and we can add the cached item (which may have
    // WeakMap cached applied to it) to the final list
    if (incoming._reactKey === cached?._reactKey) {
      toReturn.push(cached);
      cachedIdx += 1;
      continue;
    }

    // It's a new item at the start of the list
    toReturn.push(incoming);
  }

  // Add the last parts of the cached list
  toReturn.push(...cachedSlices.slice(cachedIdx));

  return toReturn;
}
