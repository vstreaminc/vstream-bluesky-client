import { createCookieSessionStorage } from "@remix-run/node";
import { ServerConfig } from "./config";
import { DAY, SECOND } from "@atproto/common";

type SessionData = {
  did: string;
};

type SessionFlashData = {
  error: string;
};

export function createSession(cfg: ServerConfig) {
  const { getSession, commitSession, destroySession } =
    createCookieSessionStorage<SessionData, SessionFlashData>({
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
