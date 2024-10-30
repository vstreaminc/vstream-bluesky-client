import { envInt, envStr, envList } from "@atproto/common";

export const readEnv = (): ServerEnvironment => {
  return {
    // server
    port: envInt("PORT"),
    hostname: envStr("VST_HOSTNAME"),

    // turso
    tursoAuthToken: envStr("TURSO_AUTH_TOKEN"),
    tursoEncryptionKey: envStr("TURSO_ENCRYPTION_KEY"),
    tursoDatabaseURL: envStr("TURSO_DATABASE_URL"),

    // keys
    privateKeys: envList("PRIVATE_KEYS"),
  };
};

export type ServerEnvironment = {
  // server
  port?: number;
  hostname?: string;

  // turso
  tursoAuthToken?: string;
  tursoEncryptionKey?: string;
  tursoDatabaseURL?: string;

  // keys
  privateKeys?: string[];
};
