import { JoseKey } from "@atproto/jwk-jose";
import { NodeOAuthClient } from "@atproto/oauth-client-node";
import { createClient as createAtProtoClient } from "../atProto";
import { ServerConfig } from "../config";
import { createDB, Database } from "../db";
import { createSession, SessionAPI } from "../session";

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
  const sessionAPI = createSession(cfg);

  return {
    appDB,
    atProtoClient,
    cfg,
    session: sessionAPI,
  };
}

/**
 * A singleton context for the application. Is created once on application start
 *
 * It is available to all Remix routes
 */
export type AppContext = {
  appDB: Database;
  atProtoClient: NodeOAuthClient;
  cfg: ServerConfig;
  session: SessionAPI;
};
