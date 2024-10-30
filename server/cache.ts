import { Database, KVStore } from "./db";

export function createCache<T = unknown>(db: Database, prefix: string) {
  function is_expired(obj: KVStore) {
    if (!obj.expires_at) return false;
    return Date.now() > new Date(obj.expires_at).getTime();
  }

  async function set(key: string, value: T | null, expires_in?: number) {
    const expiresAt =
      typeof expires_in === "number" ? Date.now() + expires_in : null;
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

  async function get(key: string): Promise<T | null | undefined> {
    const found = await db
      .selectFrom("kv_store")
      .selectAll()
      .where("key", "=", prefix + key)
      .executeTakeFirst();

    if (found && is_expired(found)) {
      // Key has expired, time to delete
      await del(key);
      return undefined;
    }

    return found ? JSON.parse(found.value) : undefined;
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
    del,
  };
}

export type Cache<T> = ReturnType<typeof createCache<T>>;
