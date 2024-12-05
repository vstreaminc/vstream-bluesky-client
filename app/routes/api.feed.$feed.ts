import { SECOND } from "@atproto/common";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { feedGenerator, hydrateFeedViewVStreamPost } from "~/lib/bsky.server";
import { take } from "~/lib/utils";
import type { VStreamFeedViewPostSlice } from "~/types";

export type SearchParams = {
  cursor?: string;
};

export async function loader(args: LoaderFunctionArgs): Promise<{
  slices: VStreamFeedViewPostSlice[];
  cursor?: string;
}> {
  const cursorFromQuery =
    new URLSearchParams(args.request.url.split("?")[1]).get("cursor") ??
    undefined;
  const name = args.params.feed!;

  const [agent, cache] = await Promise.all([
    args.context.requireLoggedInUser(),
    args.context.cache(),
  ]);
  const moderationOpts = await args.context.bsky.cachedModerationOpts(agent);

  let fetcher: Parameters<typeof feedGenerator>[0];
  const [type, did, _opts] = name.split("|");
  if (type === "home") {
    fetcher = (opts) => agent.getTimeline(opts);
  } else if (type === "author") {
    fetcher = (opts) => agent.getAuthorFeed({ ...opts, actor: did });
  } else {
    throw new Error("Unknown feed type");
  }

  const gen = feedGenerator(fetcher, {
    userDid: agent.assertDid,
    initalCusor: cursorFromQuery,
    moderationOpts,
  });
  const finders = {
    getProfile: (did: string) =>
      args.context.bsky.cachedFindProfile(agent, did),
  };

  return cache.getOrSet(
    `feed:${name}:${cursorFromQuery}`,
    async () => {
      const res = await take(gen, 20);
      await Promise.all(
        res.flatMap((slice) =>
          slice.items.map((post) => hydrateFeedViewVStreamPost(post, finders)),
        ),
      );
      return { slices: res, cursor: gen.cursor };
    },
    {
      expiresIn: 5 * SECOND,
    },
  );
}
