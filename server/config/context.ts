import { JoseKey } from "@atproto/jwk-jose";
import { NodeOAuthClient } from "@atproto/oauth-client-node";
import { createClient as createAtProtoClient } from "../atProto";
import { ServerConfig } from "./config";
import { createDB, Database } from "../db";

export async function fromConfig(cfg: ServerConfig): Promise<AppContext> {
  const appDB = createDB(cfg);

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
  appDB: Database;
  atProtoClient: NodeOAuthClient;
  cfg: ServerConfig;
};
