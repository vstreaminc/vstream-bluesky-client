import {
  type NodeSavedState,
  type NodeSavedSession,
  NodeOAuthClient,
  type NodeOAuthClientOptions,
} from "@atproto/oauth-client-node";
import type { ServerConfig } from "./config";
import { createCache } from "./cache";
import type { Database } from "./db";

const REQUESTED_SCOPES = ["atproto", "transition:generic"].join(" ");

export function createClient(
  appDB: Database,
  keyset: NonNullable<NodeOAuthClientOptions["keyset"]>,
  cfg: ServerConfig,
) {
  const stateCache = createCache<NodeSavedState>(appDB, "state:");
  const sessionCache = createCache<NodeSavedSession>(appDB, "session:");

  // Client ID has some strange requirements for BSky OAuth. When in dev, one
  // must use plain old localhost for the domain and use a NON-localhost for
  // the redirect_uri.
  // See: https://atproto.com/specs/oauth
  // See: https://github.com/bluesky-social/statusphere-example-app/blob/bcb0d344e4def83d389298d9eb32274d41d2f402/src/auth/client.ts#L13-L15
  const redirectPath = "/auth/bsky/callback";
  const redirectUri = cfg.service.devMode
    ? `http://127.0.0.1:${cfg.service.port}${redirectPath}`
    : `${cfg.service.publicUrl}${redirectPath}`;
  const clientID = cfg.service.devMode
    ? `http://localhost?redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(REQUESTED_SCOPES)}`
    : `${cfg.service.publicUrl}/.well-known/client-metadata.json`;

  return new NodeOAuthClient({
    // This object will be used to build the payload of the /client-metadata.json
    // endpoint metadata, exposing the client metadata to the OAuth server.
    clientMetadata: {
      // Must be a URL that will be exposing this metadata
      client_id: clientID,
      client_name: `VStream`,
      client_uri: `${cfg.service.publicUrl}`,
      logo_uri: `${cfg.service.publicUrl}/logo.png`,
      tos_uri: `${cfg.service.publicUrl}/tos`,
      policy_uri: `${cfg.service.publicUrl}/policy`,
      redirect_uris: [redirectUri],
      scope: REQUESTED_SCOPES,
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      application_type: "web",
      // TODO: Remove this when we're generating JWTs locally
      token_endpoint_auth_method: Array.from(keyset).length > 0 ? "private_key_jwt" : "none",
      token_endpoint_auth_signing_alg: cfg.bsky.signingAlg,
      dpop_bound_access_tokens: true,
      jwks_uri: `${cfg.service.publicUrl}/.well-known/jwks.json`,
    },

    // Used to authenticate the client to the token endpoint. Will be used to
    // build the jwks object to be exposed on the "jwks_uri" endpoint.
    keyset,

    // Interface to store authorization state data (during authorization flows)
    stateStore: {
      async set(key, internalState) {
        await stateCache.set(key, internalState, cfg.bsky.stateStoreExpiresIn);
      },
      async get(key) {
        const x = await stateCache.get(key);
        return x ?? undefined;
      },
      del: stateCache.del.bind(stateCache),
    },

    // Interface to store authenticated session data
    sessionStore: {
      async set(key, internalState) {
        await sessionCache.set(key, internalState);
      },
      async get(key) {
        const x = await sessionCache.get(key);
        return x ?? undefined;
      },
      del: sessionCache.del.bind(sessionCache),
    },

    // A lock to prevent concurrent access to the session store. Optional if only one instance is running.
    // TODO: Implement this
    // requestLock,
  });
}
