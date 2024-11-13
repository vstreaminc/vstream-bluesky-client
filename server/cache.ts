import DataLoader from "dataloader";
import { Database, KVStore } from "./db";

function isExpired(obj: KVStore): obj is KVStore & { expires_at: number } {
  if (!obj.expires_at) return false;
  return Date.now() > obj.expires_at;
}

function isStaleWhileRevalidate(obj: KVStore, staleFor: number | undefined) {
  if (typeof staleFor !== "number" || !isExpired(obj)) return false;
  return Date.now() < obj.expires_at + staleFor;
}

export function createCache<T = unknown>(db: Database, prefix: string) {
  async function set(key: string, value: T | null, expiresIn?: number) {
    const expiresAt =
      typeof expiresIn === "number" ? Date.now() + expiresIn : null;
    const values = {
      key: prefix + key,
      value: JSON.stringify(value),
      expires_at: expiresAt,
    };
    await db
      .insertInto("kv_store")
      .values(values)
      .onConflict((oc) =>
        oc.doUpdateSet({ value: values.value, expires_at: values.expires_at }),
      )
      .execute();
  }

  async function getRaw(key: string): Promise<KVStore | undefined> {
    const found = await db
      .selectFrom("kv_store")
      .selectAll()
      .where("key", "=", prefix + key)
      .executeTakeFirst();

    return found;
  }

  async function get(
    key: string,
    opts?: { skipExpiredDel?: boolean },
  ): Promise<T | null | undefined> {
    const found = await getRaw(key);

    if (found && isExpired(found)) {
      // Key has expired, time to delete
      if (!opts?.skipExpiredDel) await del(key);
      return undefined;
    }

    return found ? JSON.parse(found.value) : undefined;
  }

  async function getMany(
    keys: readonly string[],
    opts?: { skipExpiredDel?: boolean },
  ): Promise<(T | null | undefined)[]> {
    const found = await db
      .selectFrom("kv_store")
      .selectAll()
      .where(
        "key",
        "in",
        keys.map((key) => prefix + key),
      )
      .execute();

    const toDel: Promise<void>[] = [];
    const map = new Map<string, KVStore>();
    for (const row of found) {
      if (isExpired(row)) {
        if (!opts?.skipExpiredDel) toDel.push(del(row.key));
      } else {
        map.set(row.key, row);
      }
    }
    if (toDel.length > 0) await Promise.all(toDel);

    return keys.map((key) => {
      const row = map.get(prefix + key);
      return row ? JSON.parse(row.value) : undefined;
    });
  }

  async function getOrSet<V extends T | null>(
    key: string,
    fn: () => V | Promise<V>,
    opts?: {
      expiresIn?: number;
      /**
       * Allows for the returning of stale (expired) data for a peroid of time
       *
       * If a cache item is stale, this is the grace peroid where we can
       * still return the stale data, but we will refresh the data in the
       * background so (hopefully) the next time the cache is fetched from
       * the cache will be replaced with fresh data
       */
      staleWhileRevalidate?: number;
    },
  ): Promise<V> {
    let value: T | null;
    const row = await getRaw(key);
    if (
      row === undefined ||
      (isExpired(row) &&
        !isStaleWhileRevalidate(row, opts?.staleWhileRevalidate))
    ) {
      value = await fn();
      await set(key, value, opts?.expiresIn);
      return value as V;
    } else if (
      isExpired(row) &&
      isStaleWhileRevalidate(row, opts?.staleWhileRevalidate)
    ) {
      // Perform revalidation in background
      // FIXME: Some sort of lock should happen here or two calls can start
      //        two seperate revalidations at the same time
      void Promise.resolve(fn())
        .then((value) => set(key, value, opts?.expiresIn))
        .catch((err) => {
          console.error("Failed to set during stale revalidation", key, err);
        });
    }
    return JSON.parse(row.value);
  }

  async function del(key: string) {
    await db
      .deleteFrom("kv_store")
      .where("key", "=", prefix + key)
      .execute();
  }

  return {
    set,
    get,
    getMany,
    getOrSet,
    del,
  };
}

export type Cache<T> = ReturnType<typeof createCache<T>>;

export function createRequestCache<T = unknown>(dbCache: Cache<T>): Cache<T> {
  const loader = new DataLoader<string, T | null | undefined>(async (keys) => {
    const values = await dbCache.getMany(keys);
    for (const [idx, key] of keys.entries()) {
      const value = values[idx];
      loaderWithoutExpiring.prime(key, value);
    }
    return values;
  });
  const loaderWithoutExpiring = new DataLoader<string, T | null | undefined>(
    async (keys) => {
      const values = await dbCache.getMany(keys, { skipExpiredDel: true });
      for (const [idx, key] of keys.entries()) {
        const value = values[idx];
        loader.prime(key, value);
      }
      return values;
    },
  );

  const set: Cache<T>["set"] = async (key, value, expiresIn) => {
    loader.prime(key, value);
    await dbCache.set(key, value, expiresIn);
  };

  const getMany: Cache<T>["getMany"] = async (keys) => {
    const values = await loader.loadMany(keys);
    return values.map((v) => (v instanceof Error ? undefined : v));
  };

  const getOrSet: Cache<T>["getOrSet"] = async (key, fn, opts) => {
    const value = await loaderWithoutExpiring.load(key);
    if (value === undefined) {
      const valueP = dbCache.getOrSet(key, fn, opts);
      loader.prime(key, valueP);
      loaderWithoutExpiring.prime(key, valueP);
      return await valueP;
    }
    // Need to do this nastyness to get around generics
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return value as any;
  };

  const del: Cache<T>["del"] = async (key) => {
    loader.clear(key);
    await dbCache.del(key);
  };

  return {
    set,
    get: loader.load.bind(loader),
    getMany,
    getOrSet,
    del,
  };
}
