import type express from "express";
import { redirect } from "@remix-run/node";
import {
  Agent,
  type AppBskyLabelerDefs,
  BskyAgent,
  type BskyPreferences,
  interpretLabelValueDefinitions,
  type ModerationOpts,
} from "@atproto/api";
import { DAY, MINUTE } from "@atproto/common";
import type { IntlShape } from "react-intl";
import DataLoader from "dataloader";
import type { VStreamProfileViewSimple } from "~/types";
import type { SupportedLocale } from "~/lib/locale";
import { createIntl } from "~/lib/locale.server";
import { memoize0, memoizeObject1 } from "~/lib/memoize";
import { profiledDetailedToSimple } from "~/lib/bsky.server";
import {
  DEFAULT_LOGGED_OUT_LABEL_PREFERENCES,
  DEFAULT_LOGGED_OUT_PREFERENCES,
} from "~/lib/constants";
import { extractCurrentLocale } from "../locale";
import { type Cache, createCache, createRequestCache } from "../cache";
import type { ServerConfig } from "../config";
import type { AppContext } from "./appContext";

export function fromRequest(
  req: express.Request,
  ctx: AppContext,
  _cfg: ServerConfig,
): RequestContext {
  const currentLocale: IntlContext["locale"] = memoize0(() => extractCurrentLocale(req, ctx));

  // We memoize this function to only need to lookup the agent once even if
  // mutiple routes call this function at the same time
  const maybeLoggedInUser: RequestContext["maybeLoggedInUser"] = memoize0(async () => {
    const session = await ctx.session.getFromCookie(req.get("Cookie") ?? null);
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
  });

  const requireLoggedInUser: RequestContext["requireLoggedInUser"] = async () => {
    const agent = await maybeLoggedInUser();
    if (!agent) throw redirect("/login");
    return agent;
  };

  const requestCache: RequestContext["cache"] = memoize0(async () => {
    const session = await ctx.session.getFromCookie(req.get("Cookie") ?? null);
    const did = session.get("did") ?? "[guest]";

    return createRequestCache(
      // Ensure we put the current user in the cache path, as cached items will
      // likely have per user data inside of them
      createCache<unknown>(ctx.appDB, `request:${did}:`),
    );
  });

  const t = memoize0(async () => createIntl(await currentLocale()));

  const intl: IntlContext = {
    t,
    locale: currentLocale,
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
        const mappedProfiles = new Map<(typeof dids)[number], (typeof profiles)[number]>();
        for (const p of profiles) {
          mappedProfiles.set(p.did, p);
        }

        return dids.map((d) => mappedProfiles.get(d) ?? new Error("Cannot find profile"));
      }),
  );

  const cachedFindProfile: BSkyContext["cachedFindProfile"] = async (agent, did) => {
    return (await requestCache()).getOrSet(did, () => profileLoader(agent).load(did), {
      expiresIn: 30 * MINUTE,
      staleWhileRevalidate: 1 * DAY,
    });
  };

  const currentProfile: BSkyContext["currentProfile"] = memoizeObject1(async (agent) => {
    return (await requestCache()).getOrSet(
      agent.assertDid,
      () => profileLoader(agent).load(agent.assertDid),
      { expiresIn: 30 * MINUTE, staleWhileRevalidate: 1 * DAY },
    );
  });

  async function bSkyPreferences(agent: Agent) {
    if (!agent.did) return DEFAULT_LOGGED_OUT_PREFERENCES;
    const res = await agent.getPreferences();
    return {
      ...res,
      savedFeeds: res.savedFeeds.filter((f) => f.type !== "unknown"),
    };
  }

  async function labelDefinitions(agent: Agent, prefs: BskyPreferences) {
    const dids = Array.from(
      new Set(BskyAgent.appLabelers.concat(prefs.moderationPrefs.labelers.map((l) => l.did) || [])),
    );
    const res = await agent.app.bsky.labeler.getServices({
      dids,
      detailed: true,
    });
    const labelers = res.data.views as AppBskyLabelerDefs.LabelerViewDetailed[];
    return {
      labelDefs: Object.fromEntries(
        labelers.map((labeler) => [labeler.creator.did, interpretLabelValueDefinitions(labeler)]),
      ),
      labelers,
    };
  }

  async function moderationOpts(agent: Agent): Promise<ModerationOpts> {
    const prefs = await bSkyPreferences(agent);
    const { moderationPrefs } = prefs;
    const { labelDefs } = await labelDefinitions(agent, prefs);
    const userDid = agent.did;
    return {
      userDid,
      prefs: {
        ...moderationPrefs,
        labelers: moderationPrefs.labelers.length
          ? moderationPrefs.labelers
          : BskyAgent.appLabelers.map((did) => ({
              did,
              labels: DEFAULT_LOGGED_OUT_LABEL_PREFERENCES,
            })),
        hiddenPosts: [],
      },
      labelDefs,
    };
  }

  const cachedModerationOpts: BSkyContext["cachedModerationOpts"] = memoizeObject1(
    async (agent) => {
      return (await requestCache()).getOrSet("moderationOpts", () => moderationOpts(agent), {
        expiresIn: 5 * MINUTE,
        staleWhileRevalidate: 1 * DAY,
      });
    },
  );

  const bsky: BSkyContext = {
    cachedFindProfile,
    cachedModerationOpts,
    currentProfile,
    profileLoader,
  };

  return {
    bsky,
    cache: requestCache,
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
  cache: () => Promise<Cache<unknown>>;
  intl: IntlContext;
  maybeLoggedInUser: () => Promise<Agent | null>;
  requireLoggedInUser: () => Promise<Agent>;
};

export type BSkyContext = {
  profileLoader: (agent: Agent) => DataLoader<string, VStreamProfileViewSimple>;
  cachedFindProfile: (agent: Agent, did: string) => Promise<VStreamProfileViewSimple>;
  currentProfile: (agent: Agent) => Promise<VStreamProfileViewSimple>;
  cachedModerationOpts: (agent: Agent) => Promise<ModerationOpts>;
};

export type IntlContext = {
  t: () => Promise<IntlShape>;
  locale: () => Promise<SupportedLocale>;
};
