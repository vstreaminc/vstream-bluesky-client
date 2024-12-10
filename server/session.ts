import { createCookieSessionStorage } from "react-router";
import { DAY, SECOND } from "@atproto/common";
import type { SupportedLocale } from "~/lib/locale";
import type { ServerConfig } from "./config";

type SessionData = {
  did: string;
  locale: SupportedLocale;
};

type SessionFlashData = {
  error: string;
};

export function createSession(cfg: ServerConfig) {
  const { getSession, commitSession, destroySession } = createCookieSessionStorage<
    SessionData,
    SessionFlashData
  >({
    // a Cookie from `createCookie` or the CookieOptions to create one
    cookie: {
      name: "__session",
      httpOnly: true,
      maxAge: (14 * DAY) / SECOND,
      path: "/",
      sameSite: "lax",
      secrets: [cfg.service.sessionSecret],
      secure: !cfg.service.devMode,
    },
  });

  return {
    getFromCookie: (cookie: string | null) => getSession(cookie),
    get: (req: Request) => getSession(req.headers.get("Cookie")),
    commit: commitSession,
    destroy: destroySession,
  };
}

export type SessionAPI = ReturnType<typeof createSession>;
