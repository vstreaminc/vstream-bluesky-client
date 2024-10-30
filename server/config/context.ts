import { JoseKey } from "@atproto/jwk-jose";
import {
  Client as DBClient,
  createClient as createDBClient,
} from "@libsql/client";
import { NodeOAuthClient } from "@atproto/oauth-client-node";
import { createClient as createAtProtoClient } from "../atProto";
import { ServerConfig } from "./config";

export async function fromConfig(cfg: ServerConfig): Promise<AppContext> {
  const appDB = createDBClient({
    authToken: cfg.db.authToken,
    encryptionKey: cfg.db.encryptionKey,
    url: cfg.db.url,
  });

  const bskyKeys =
    cfg.bsky.keys && cfg.bsky.keys.length > 0
      ? await Promise.all(
          cfg.bsky.keys.map((key) => JoseKey.fromImportable(key)),
        )
      : // TODO: Generate some temporary keys for local dev
        [];
  const atProtoClient = createAtProtoClient(appDB, bskyKeys, cfg);

  return {
    appDB,
    atProtoClient,
    cfg,
  };
}

export type AppContext = {
  appDB: DBClient;
  atProtoClient: NodeOAuthClient;
  cfg: ServerConfig;
};
