import { ServerEnvironment } from "./env";
import { MINUTE } from "@atproto/common";

export const envToCfg = (env: ServerEnvironment): ServerConfig => {
  const port = env.port ?? 3000;
  const hostname = env.hostname ?? "localhost";
  const publicUrl =
    hostname === "localhost"
      ? `http://localhost:${port}`
      : `https://${hostname}`;

  const service: ServiceConfig = {
    devMode: process.env.NODE_ENV !== "production",
    hostname,
    port,
    publicUrl,
    sessionSecret: env.sessionSecret ?? "s3cret1",
  };

  const db: DatabaseConfig = {
    authToken: env.tursoAuthToken,
    encryptionKey: env.tursoEncryptionKey,
    url: env.tursoDatabaseURL ?? ".data/app.db",
  };

  const bsky: BlueSkyConfig = {
    keys: env.privateKeys,
    stateStoreExpiresIn: 10 * MINUTE,
  };

  return {
    service,
    db,
    bsky,
  };
};

export type ServerConfig = {
  service: ServiceConfig;
  db: DatabaseConfig;
  bsky: BlueSkyConfig;
};

export type ServiceConfig = {
  devMode: boolean;
  hostname: string;
  port: number;
  publicUrl: string;
  sessionSecret: string;
  version?: string;
};

export type DatabaseConfig = {
  authToken?: string;
  encryptionKey?: string;
  url: string;
};

export type BlueSkyConfig = {
  keys?: string[];
  stateStoreExpiresIn: number;
};
