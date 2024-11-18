import crypto from "node:crypto";
import { JoseKey } from "@atproto/jwk-jose";
import type { NodeOAuthClient } from "@atproto/oauth-client-node";
import { createClient as createAtProtoClient } from "../atProto";
import type { ServerConfig } from "../config";
import { createDB, type Database } from "../db";
import { createSession, type SessionAPI } from "../session";

export async function fromConfig(cfg: ServerConfig): Promise<AppContext> {
  const appDB = createDB(cfg);

  const bskyKeys =
    cfg.bsky.keys && cfg.bsky.keys.length > 0
      ? await Promise.all(
          cfg.bsky.keys.map((key) =>
            JoseKey.fromImportable(
              Buffer.from(key, "base64").toString("utf8"),
              // kid is the MD5 of the base64
              crypto.createHash("md5").update(key).digest("hex"),
            ),
          ),
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
