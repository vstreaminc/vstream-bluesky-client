import { Client, Row } from "@libsql/client";

type CacheRow = Row & {
  key: string;
  value: string;
  expires_at: number | null;
};

export function createCache<T = unknown>(db: Client, prefix = "") {
  function is_expired(obj: CacheRow) {
    if (!obj.expires_at) return false;
    return Date.now() > new Date(obj.expires_at).getTime();
  }

  async function set(key: string, value: T | null, expires_in?: number) {
    if (typeof expires_in === "number") {
      await db.execute({
        sql: "INSERT INTO kv_store (key, value, expires_at) VALUES (?, ?, ?)",
        args: [prefix + key, JSON.stringify(value), Date.now() + expires_in],
      });
    } else {
      await db.execute({
        sql: "INSERT INTO kv_store (key, value) VALUES (?, ?)",
        args: [prefix + key, JSON.stringify(value)],
      });
    }
  }

  async function get(key: string): Promise<T | null | undefined> {
    const { rows } = await db.execute({
      sql: "SELECT value, expires_at FROM kv_store WHERE key = ? LIMIT 1",
      args: [prefix + key],
    });
    const found = rows[0] as CacheRow | undefined;

    if (found && is_expired(found)) {
      // Key has expired, time to delete
      await del(prefix + key);
      return undefined;
    }

    return found ? JSON.parse(found.value) : undefined;
  }

  async function del(key: string) {
    await db.execute({
      sql: "DELETE FROM kv_store WHERE key in (SELECT key FROM kv_store WHERE key = ? LIMIT 1)",
      args: [prefix + key],
    });
  }

  return {
    set,
    get,
    del,
  };
}

export type Cache<T> = ReturnType<typeof createCache<T>>;
