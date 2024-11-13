import { Kysely, Migrator, type Migration, type MigrationProvider } from "kysely";
import { LibsqlDialect } from "@libsql/kysely-libsql";
import type { ServerConfig } from "./config";

export type DatabaseSchema = {
  kv_store: KVStore;
};

export type KVStore = {
  key: string;
  value: string;
  expires_at: number | null;
};

export function createDB(cfg: ServerConfig): Database {
  return new Kysely<DatabaseSchema>({
    dialect: new LibsqlDialect({
      authToken: cfg.db.authToken,
      encryptionKey: cfg.db.encryptionKey,
      url: cfg.db.url,
    }),
  });
}

export const migrateToLatest = async (db: Database) => {
  const migrator = new Migrator({ db, provider: migrationProvider });
  const { error } = await migrator.migrateToLatest();
  if (error) throw error;
};

export type Database = Kysely<DatabaseSchema>;

// Migrations

const migrations: Record<string, Migration> = {};

const migrationProvider: MigrationProvider = {
  async getMigrations() {
    return migrations;
  },
};

migrations["001"] = {
  async up(db: Kysely<unknown>) {
    await db.schema
      .createTable("kv_store")
      .addColumn("key", "text", (col) => col.primaryKey())
      .addColumn("value", "text", (col) => col.notNull())
      .addColumn("expires_at", "integer")
      .execute();
  },
  async down(db: Kysely<unknown>) {
    await db.schema.dropTable("kv_store").execute();
  },
};
