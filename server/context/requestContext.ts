import express from "express";
import { redirect } from "@remix-run/node";
import { Agent } from "@atproto/api";
import { DAY, MINUTE } from "@atproto/common";
import { IntlShape } from "react-intl";
import type { ProfileViewVStreamSimple } from "~/types";
import { SupportedLocale } from "~/lib/locale";
import { createIntl } from "~/lib/locale.server";
import { memoize0, memoizeObject1 } from "~/lib/memoize";
import { ServerConfig } from "../config";
import { profiledDetailedToSimple } from "~/lib/bsky.server";
import { Cache, createCache, createRequestCache } from "../cache";
import { extractCurrentLocale } from "../locale";
import { AppContext } from "./appContext";
import DataLoader from "dataloader";

export function fromRequest(
  req: express.Request,
  ctx: AppContext,
  _cfg: ServerConfig,
): RequestContext {
  const currentLocale: RequestContext["currentLocale"] = memoize0(() =>
    extractCurrentLocale(req, ctx),
  );

  // We memoize this function to only need to lookup the agent once even if
  // mutiple routes call this function at the same time
  const maybeLoggedInUser: RequestContext["maybeLoggedInUser"] = memoize0(
    async () => {
      const session = await ctx.session.getFromCookie(
        req.get("Cookie") ?? null,
      );
      const did = session.get("did");
      if (!did) return null;

      try {
        const oauthSession = await ctx.atProtoClient.restore(did);
        return oauthSession ? new Agent(oauthSession) : null;
      } catch (err) {
        console.error(err);
        // oauth restore failed, bail and force to login again
        session.unset("did");
        throw redirect("/login", {
          headers: {
            "Set-Cookie": await ctx.session.commit(session),
          },
        });
      }
    },
  );

  const requireLoggedInUser: RequestContext["requireLoggedInUser"] =
    async () => {
      const agent = await maybeLoggedInUser();
      if (!agent) throw redirect("/login");
      return agent;
    };

  const requestCache = createRequestCache(
    createCache<unknown>(ctx.appDB, "request:"),
  );

  const t = memoize0(async () => createIntl(await currentLocale()));

  const intl: IntlContext = {
    t,
  };

  const profileLoader: BSkyContext["profileLoader"] = memoizeObject1(
    (agent) =>
      new DataLoader(async (dids) => {
        if (dids.length === 1) {
          return agent.app.bsky.actor
            .getProfile({ actor: dids[0] })
            .then((res) => res.data)
            .then((p) => [profiledDetailedToSimple(p)]);
        }

        const profiles = await agent.app.bsky.actor
          .getProfiles({ actors: [...dids] })
          .then((res) => res.data.profiles.map(profiledDetailedToSimple));
        const mappedProfiles = new Map<
          (typeof dids)[number],
          (typeof profiles)[number]
        >();
        for (const p of profiles) {
          mappedProfiles.set(p.did, p);
        }

        return dids.map(
          (d) => mappedProfiles.get(d) ?? new Error("Cannot find profile"),
        );
      }),
  );

  const cachedFindProfile: BSkyContext["cachedFindProfile"] = (agent, did) => {
    return requestCache.getOrSet(did, () => profileLoader(agent).load(did), {
      expiresIn: 30 * MINUTE,
      staleWhileRevalidate: 1 * DAY,
    });
  };

  const currentProfile: BSkyContext["currentProfile"] = (agent) => {
    return requestCache.getOrSet(
      agent.assertDid,
      () => profileLoader(agent).load(agent.assertDid),
      { expiresIn: 30 * MINUTE, staleWhileRevalidate: 1 * DAY },
    );
  };

  const bsky: BSkyContext = {
    cachedFindProfile,
    currentProfile,
    profileLoader,
  };

  return {
    bsky,
    cache: requestCache,
    currentLocale,
    intl,
    maybeLoggedInUser,
    requireLoggedInUser,
  };
}

/**
 * A context scopped to a certain request. Is created for each incoming request
 *
 * It is available to all Remix routes
 */
export type RequestContext = {
  bsky: BSkyContext;
  cache: Cache<unknown>;
  intl: IntlContext;
  currentLocale: () => Promise<SupportedLocale>;
  maybeLoggedInUser: () => Promise<Agent | null>;
  requireLoggedInUser: () => Promise<Agent>;
};

export type BSkyContext = {
  profileLoader: (agent: Agent) => DataLoader<string, ProfileViewVStreamSimple>;
  cachedFindProfile: (
    agent: Agent,
    did: string,
  ) => Promise<ProfileViewVStreamSimple>;
  currentProfile: (agent: Agent) => Promise<ProfileViewVStreamSimple>;
};

export type IntlContext = {
  t: () => Promise<IntlShape>;
};
