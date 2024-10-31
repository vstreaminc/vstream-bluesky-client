import { JoseKey } from "@atproto/jwk-jose";
import { NodeOAuthClient } from "@atproto/oauth-client-node";
import { Agent } from "@atproto/api";
import { createClient as createAtProtoClient } from "./atProto";
import { ServerConfig } from "./config";
import { createDB, Database } from "./db";
import { createSession, SessionAPI } from "./session";
import { redirect } from "@remix-run/node";

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

  const maybeLoggedInUser: AppContext["maybeLoggedInUser"] = async (
    request,
  ) => {
    const session = await sessionAPI.get(request);
    const did = session.get("did");
    if (!did) return null;

    try {
      const oauthSession = await atProtoClient.restore(did);
      return oauthSession ? new Agent(oauthSession) : null;
    } catch (err) {
      console.error(err);
      // oauth restore failed, bail and force to login again
      session.unset("did");
      throw redirect("/login", {
        headers: {
          "Set-Cookie": await sessionAPI.commit(session),
        },
      });
    }
  };

  const requireLoggedInUser: AppContext["requireLoggedInUser"] = async (
    request,
  ) => {
    const agent = await maybeLoggedInUser(request);
    if (!agent) throw redirect("/login");
    return agent;
  };

  return {
    appDB,
    atProtoClient,
    cfg,
    maybeLoggedInUser,
    requireLoggedInUser,
    session: sessionAPI,
  };
}

export type AppContext = {
  appDB: Database;
  atProtoClient: NodeOAuthClient;
  cfg: ServerConfig;
  maybeLoggedInUser: (request: Request) => Promise<Agent | null>;
  requireLoggedInUser: (request: Request) => Promise<Agent>;
  session: SessionAPI;
};
