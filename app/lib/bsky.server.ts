import {
  AppBskyEmbedImages,
  AppBskyFeedDefs,
  AppBskyFeedPost,
  AtUri,
} from "@atproto/api";
import type {
  FeedViewPost,
  ProfileViewDetailed,
  ProfileViewVStreamSimple,
  FeedViewVStreamPostSlice,
  FeedViewVStreamPost,
} from "~/types";
import { FeedTuner, FeedViewPostsSlice } from "./feedTuner";
import { omit } from "./utils";

export const DISCOVER_FEED_URI =
  "at://did:plc:z72i7hdynmk6r22z27h6tvur/app.bsky.feed.generator/whats-hot";

export function makeRecordUri(
  didOrName: string,
  collection: string,
  rkey: string,
): string {
  const urip = new AtUri("at://host/");
  urip.host = didOrName.startsWith("@") ? didOrName.slice(1) : didOrName;
  urip.collection = collection;
  urip.rkey = rkey;
  return urip.toString();
}

function formatHandle(handle: string): string {
  return `@${handle.trim()}`;
}

// \u2705 = ✅
// \u2713 = ✓
// \u2714 = ✔
// \u2611 = ☑
const CHECK_MARKS_RE = /[\u2705\u2713\u2714\u2611]/gu;
const CONTROL_CHARS_RE =
  // eslint-disable-next-line no-control-regex
  /[\u0000-\u001F\u007F-\u009F\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;
const MULTIPLE_SPACES_RE = /[\s][\s\u200B]+/g;

export function formatDisplayName(str: string | undefined): string {
  if (typeof str === "string") {
    return str
      .replace(CHECK_MARKS_RE, "")
      .replace(CONTROL_CHARS_RE, "")
      .replace(MULTIPLE_SPACES_RE, " ")
      .trim();
  }
  return "";
}

export function profiledDetailedToSimple(
  profile: ProfileViewDetailed,
): ProfileViewVStreamSimple {
  return {
    avatar: profile.avatar,
    banner: profile.banner,
    createdAt: profile.createdAt,
    description: profile.description,
    did: profile.did,
    displayName: formatDisplayName(profile.displayName),
    followersCount: profile.followersCount,
    followsCount: profile.followsCount,
    handle: formatHandle(profile.handle),
    indexedAt: profile.indexedAt,
    postsCount: profile.postsCount,
  };
}

export function bSkyPostFeedViewPostToVStreamPostItem<
  T extends {
    post: AppBskyFeedDefs.PostView;
    record: AppBskyFeedPost.Record;
  },
>(item: T): FeedViewVStreamPost {
  return {
    _reactKey: item.post.uri,
    uri: item.post.uri,
    rkey: new AtUri(item.post.uri).rkey,
    cid: item.post.cid,
    replyCount: item.post.replyCount,
    repostCount: item.post.repostCount,
    likeCount: item.post.likeCount,
    quoteCount: item.post.quoteCount,
    indexedAt: item.post.indexedAt,
    viewer: item.post.viewer,
    author: {
      did: item.post.author.did,
      handle: formatHandle(item.post.author.handle),
      displayName: formatDisplayName(item.post.author.displayName),
      avatar: item.post.author.avatar,
      viewer: item.post.author.viewer
        ? omit(item.post.author.viewer, ["mutedFromList", "bannedFromList"])
        : undefined,
    },
    embed: AppBskyEmbedImages.isView(item.post.embed)
      ? item.post.embed
      : undefined,
    createdAt: item.record.createdAt,
    plainText: item.record.text,
    // TODO: Handle this
    richText: [],
  };
}

function bSkySliceToVStreamSlice(
  slice: FeedViewPostsSlice,
): FeedViewVStreamPostSlice {
  return {
    _reactKey: slice._reactKey,
    isIncompleteThread: slice.isIncompleteThread,
    reason: AppBskyFeedDefs.isReasonRepost(slice.reason)
      ? {
          $type: "com.vstream.feed.defs#reasonRepost",
          by: {
            did: slice.reason.by.did,
            handle: formatHandle(slice.reason.by.handle),
            displayName: formatDisplayName(slice.reason.by.displayName),
            avatar: slice.reason.by.avatar,
          },
        }
      : undefined,
    items: slice.items.map((item, i) => ({
      ...bSkyPostFeedViewPostToVStreamPostItem(item),
      _reactKey: `${slice._reactKey}-${i}-${item.post.uri}`,
    })),
  };
}

export async function* feedGenerator(
  fn: (options?: {
    cursor?: string;
    limit?: number;
  }) => Promise<{ data: { cursor?: string; feed: FeedViewPost[] } }>,
  userDid: string,
  initalCusor?: string,
): AsyncIterableIterator<FeedViewVStreamPostSlice> {
  const tuner = new FeedTuner([
    FeedTuner.removeOrphans,
    FeedTuner.followedRepliesOnly({ userDid }),
    FeedTuner.dedupThreads,
  ]);

  let cursor = initalCusor;
  do {
    const res = await fn({ cursor, limit: 100 });
    cursor = res.data.cursor;
    const slices = tuner.tune(res.data.feed);

    yield* slices.map(bSkySliceToVStreamSlice);
  } while (cursor);
}

export async function* exploreGenerator(
  fn: (options?: {
    cursor?: string;
    limit?: number;
  }) => Promise<{ data: { cursor?: string; feed: FeedViewPost[] } }>,
  initalCusor?: string,
): AsyncIterableIterator<FeedViewVStreamPost> {
  const tuner = new FeedTuner([
    FeedTuner.dedupThreads,
    FeedTuner.removeReposts,
    FeedTuner.removeReplies,
  ]);
  const basicPosts: FeedViewPostsSlice[] = [];
  const imagePosts: FeedViewPostsSlice[] = [];
  const order = [
    "image",
    "image",
    "image",
    "basic",
    "image",
    "basic",
    "image",
    "basic",
    "image",
    "basic",
    "image",
  ] as const;

  let cursor = initalCusor;
  do {
    const res = await fn({ cursor, limit: 100 });
    cursor = res.data.cursor;
    const slices = tuner.tune(res.data.feed);
    for (const slice of slices) {
      if (AppBskyEmbedImages.isView(slice.items[0].post.embed)) {
        imagePosts.push(slice);
      } else {
        basicPosts.push(slice);
      }
    }
    for (const type of order) {
      switch (type) {
        case "image": {
          const slice = imagePosts.shift();
          if (!slice) continue;
          yield bSkyPostFeedViewPostToVStreamPostItem(slice.items[0]);
          break;
        }
        case "basic": {
          const slice = basicPosts.shift();
          if (!slice) continue;
          yield bSkyPostFeedViewPostToVStreamPostItem(slice.items[0]);
          break;
        }
      }
    }
  } while (cursor);
}
