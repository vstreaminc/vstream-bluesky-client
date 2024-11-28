import {
  AppBskyEmbedImages,
  AppBskyFeedDefs,
  AppBskyFeedPost,
  AtUri,
  RichText as AtProtoRichText,
  type AppBskyFeedGetPostThread,
  moderatePost,
  type ModerationOpts,
  type ModerationBehavior,
} from "@atproto/api";
import type {
  BSkyFeedViewPost,
  BskyProfileViewDetailed,
  VStreamProfileViewSimple,
  VStreamFeedViewPostSlice,
  VStreamFeedViewPost,
  RichText,
  TextNode,
  HashtagNode,
  LinkNode,
  MentionNode,
  VStreamPostThreadNode,
  VStreamPostThread,
  BskyPostRecord,
} from "~/types";
import { FeedTuner, type FeedViewPostsSlice } from "./feedTuner";
import { pick } from "./utils";

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
  profile: BskyProfileViewDetailed,
): VStreamProfileViewSimple {
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
>(
  item: T,
  opts?: { moderationOpts: ModerationOpts; context: keyof ModerationBehavior },
): VStreamFeedViewPost {
  const moderation = opts
    ? moderatePost(item.post, opts.moderationOpts).ui(opts.context)
    : undefined;

  return {
    _reactKey: item.post.uri,
    uri: item.post.uri,
    rkey: new AtUri(item.post.uri).rkey,
    cid: item.post.cid,
    replyCount: item.post.replyCount ?? 0,
    repostCount: item.post.repostCount ?? 0,
    likeCount: item.post.likeCount ?? 0,
    quoteCount: item.post.quoteCount ?? 0,
    indexedAt: item.post.indexedAt,
    viewer: item.post.viewer,
    author: {
      did: item.post.author.did,
      handle: formatHandle(item.post.author.handle),
      displayName: formatDisplayName(item.post.author.displayName),
      avatar: item.post.author.avatar,
      viewer: item.post.author.viewer
        ? pick(item.post.author.viewer, [
            "muted",
            "blockedBy",
            "blocking",
            "following",
            "followedBy",
          ])
        : undefined,
    },
    embed: AppBskyEmbedImages.isView(item.post.embed)
      ? {
          $type: "com.vstream.embed.images#view",
          images: item.post.embed.images.map((i) => ({
            alt: i.alt,
            fullsize: i.fullsize,
            height: i.aspectRatio?.height,
            thumb: i.thumb,
            width: i.aspectRatio?.width,
          })),
        }
      : undefined,
    createdAt: item.record.createdAt,
    facets: item.record.facets,
    plainText: item.record.text,
    // TODO: Handle this
    richText: [],
    moderation: {
      filter: moderation?.filter ?? false,
      blur: moderation?.blur ?? false,
      alert: moderation?.alert ?? false,
      inform: moderation?.inform ?? false,
    },
  };
}

function bSkySliceToVStreamSlice(
  slice: FeedViewPostsSlice,
  opts?: { moderationOpts: ModerationOpts; context: keyof ModerationBehavior },
): VStreamFeedViewPostSlice {
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
      ...bSkyPostFeedViewPostToVStreamPostItem(item, opts),
      _reactKey: `${slice._reactKey}-${i}-${item.post.uri}`,
    })),
  };
}

export function feedGenerator(
  fn: (options?: {
    cursor?: string;
    limit?: number;
  }) => Promise<{ data: { cursor?: string; feed: BSkyFeedViewPost[] } }>,
  opts: {
    moderationOpts?: ModerationOpts;
    userDid: string;
    initalCusor?: string;
  },
): AsyncIterable<VStreamFeedViewPostSlice> & { cursor: string | undefined } {
  const tuner = new FeedTuner([
    FeedTuner.removeOrphans,
    FeedTuner.followedRepliesOnly({ userDid: opts.userDid }),
    FeedTuner.dedupThreads,
  ]);

  return {
    cursor: opts.initalCusor,
    async *[Symbol.asyncIterator]() {
      do {
        const res = await fn({ cursor: this.cursor, limit: 100 });
        this.cursor = res.data.cursor;
        const slices = tuner.tune(res.data.feed);

        yield* slices.map((slice) =>
          bSkySliceToVStreamSlice(
            slice,
            opts.moderationOpts
              ? { moderationOpts: opts.moderationOpts, context: "contentList" }
              : undefined,
          ),
        );
      } while (this.cursor);
    },
  };
}

export function exploreGenerator(
  fn: (options?: {
    cursor?: string;
    limit?: number;
  }) => Promise<{ data: { cursor?: string; feed: BSkyFeedViewPost[] } }>,
  opts?: {
    moderationOpts?: ModerationOpts;
    initalCusor?: string;
  },
): AsyncIterable<VStreamFeedViewPost> & { cursor: string | undefined } {
  const tuner = new FeedTuner([
    FeedTuner.dedupThreads,
    FeedTuner.removeReposts,
    FeedTuner.removeReplies,
  ]);
  const basicPosts: VStreamFeedViewPost[] = [];
  const imagePosts: VStreamFeedViewPost[] = [];
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

  return {
    cursor: opts?.initalCusor,
    async *[Symbol.asyncIterator]() {
      do {
        const res = await fn({ cursor: this.cursor, limit: 30 });
        this.cursor = res.data.feed.length ? res.data.cursor : undefined;
        const slices = tuner.tune(res.data.feed);
        for (const slice of slices) {
          const post = bSkyPostFeedViewPostToVStreamPostItem(
            slice.items[0],
            opts?.moderationOpts
              ? {
                  moderationOpts: opts.moderationOpts,
                  context: "contentList",
                }
              : undefined,
          );
          if (
            post.moderation.filter ||
            post.moderation.blur ||
            post.moderation.inform ||
            post.moderation.alert
          ) {
            continue;
          }
          if (AppBskyEmbedImages.isView(slice.items[0].post.embed)) {
            imagePosts.push(post);
          } else {
            basicPosts.push(post);
          }
        }
        while (imagePosts.length > 0 && basicPosts.length > 0) {
          for (const type of order) {
            switch (type) {
              case "image": {
                const post = imagePosts.shift();
                if (!post) continue;
                yield post;
                break;
              }
              case "basic": {
                const post = basicPosts.shift();
                if (!post) continue;
                yield post;
                break;
              }
            }
          }
        }
      } while (this.cursor);
    },
  };
}

export async function hydrateFeedViewVStreamPost(
  post: VStreamFeedViewPost,
  finders: {
    getProfile: (did: string) => Promise<VStreamProfileViewSimple>;
  },
): Promise<VStreamFeedViewPost> {
  // Already hydrated, return
  if (post.richText.length > 0) return post;

  const richTextP = Array.from(
    new AtProtoRichText({
      text: post.plainText,
      facets: post.facets as BskyPostRecord["facets"],
    }).segments(),
  ).flatMap<RichText | Promise<RichText>>((seg) => {
    if (!seg.facet) {
      return [{ $type: "text", text: seg.text } satisfies TextNode];
    } else if (seg.tag) {
      return [
        { $type: "hashtag", tag: "#" + seg.tag.tag } satisfies HashtagNode,
      ];
    } else if (seg.link) {
      return [
        {
          $type: "link",
          text: seg.text,
          href: seg.link.uri,
        } satisfies LinkNode,
      ];
    } else if (seg.mention) {
      return [
        finders.getProfile(seg.mention.did).then(
          (profile) =>
            ({
              $type: "mention",
              handle: profile.handle,
              did: profile.did,
            }) satisfies MentionNode,
        ),
      ];
    }
    // TODO: Handle emoji nodes

    return [];
  });

  post.richText = await Promise.all(richTextP);
  // Send less bytes down by clearing out the old text
  post.plainText = "";
  post.facets = [];
  return post;
}

const REPLY_TREE_DEPTH = 10;

export async function loadPostThread(
  uri: string,
  load: (
    query: AppBskyFeedGetPostThread.QueryParams,
  ) => Promise<AppBskyFeedGetPostThread.Response>,
): Promise<VStreamPostThreadNode> {
  const res = await load({ uri, depth: REPLY_TREE_DEPTH });

  if (!res.success) {
    return { $type: "unknown", uri };
  }

  const hydrations: Promise<unknown>[] = [];
  const thread = bSkyThreadNodeToVStreamThreadNode(res.data.thread);
  annotateSelfThread(thread);
  await Promise.all(hydrations);

  return thread;
}

export function bSkyThreadNodeToVStreamThreadNode(
  node: AppBskyFeedGetPostThread.Response["data"]["thread"],
  depth = 0,
  direction: "up" | "down" | "start" = "start",
): VStreamPostThreadNode {
  if (
    AppBskyFeedDefs.isThreadViewPost(node) &&
    AppBskyFeedPost.isRecord(node.post.record) &&
    AppBskyFeedPost.validateRecord(node.post.record).success
  ) {
    const post = node.post;
    const vstreamPost = bSkyPostFeedViewPostToVStreamPostItem({
      post,
      record: node.post.record,
    });
    let parent;
    if (node.parent && direction !== "down") {
      parent = bSkyThreadNodeToVStreamThreadNode(node.parent, depth - 1, "up");
    }
    let replies;
    if (node.replies?.length && direction !== "up") {
      replies = node.replies
        .map((reply) =>
          bSkyThreadNodeToVStreamThreadNode(reply, depth + 1, "down"),
        )
        // do not show blocked posts in replies
        .filter((node) => node.$type !== "blocked");
    }

    return {
      $type: "post",
      _reactKey: node.post.uri,
      uri: node.post.uri,
      post: vstreamPost,
      parent,
      replies,
      ctx: {
        depth,
        isHighlightedPost: depth === 0,
        hasMore:
          direction === "down" && !node.replies?.length && !!node.replyCount,
        isSelfThread: false, // populated `annotateSelfThread`
        hasMoreSelfThread: false, // populated in `annotateSelfThread`
      },
    };
  } else if (AppBskyFeedDefs.isBlockedPost(node)) {
    return {
      $type: "blocked",
      _reactKey: node.uri,
      uri: node.uri,
      ctx: { depth },
    };
  } else if (AppBskyFeedDefs.isNotFoundPost(node)) {
    return {
      $type: "not-found",
      _reactKey: node.uri,
      uri: node.uri,
      ctx: { depth },
    };
  } else {
    return { $type: "unknown", uri: "" };
  }
}

function annotateSelfThread(thread: VStreamPostThreadNode) {
  if (thread.$type !== "post") {
    return;
  }
  const selfThreadNodes: VStreamPostThread[] = [thread];

  let parent: VStreamPostThreadNode | undefined = thread.parent;
  while (parent) {
    if (
      parent.$type !== "post" ||
      parent.post.author.did !== thread.post.author.did
    ) {
      // not a self-thread
      return;
    }
    selfThreadNodes.unshift(parent);
    parent = parent.parent;
  }

  let node = thread;
  for (let i = 0; i < 10; i++) {
    const reply = node.replies?.find(
      (r) => r.$type === "post" && r.post.author.did === thread.post.author.did,
    );
    if (reply?.$type !== "post") {
      break;
    }
    selfThreadNodes.push(reply);
    node = reply;
  }

  if (selfThreadNodes.length > 1) {
    for (const selfThreadNode of selfThreadNodes) {
      selfThreadNode.ctx.isSelfThread = true;
    }
    const last = selfThreadNodes[selfThreadNodes.length - 1];
    if (
      last &&
      last.ctx.depth === REPLY_TREE_DEPTH && // at the edge of the tree depth
      last.post.replyCount && // has replies
      !last.replies?.length // replies were not hydrated
    ) {
      last.ctx.hasMoreSelfThread = true;
    }
  }
}

export function sortPostThread(
  node: VStreamPostThreadNode,
  currentDid: string | undefined,
): VStreamPostThreadNode {
  if (node.$type !== "post") {
    return node;
  }
  if (node.replies) {
    node.replies.sort((a, b) => {
      if (a.$type !== "post") {
        return 1;
      }
      if (b.$type !== "post") {
        return -1;
      }

      const aIsByOp = a.post.author.did === node.post?.author.did;
      const bIsByOp = b.post.author.did === node.post?.author.did;
      if (aIsByOp && bIsByOp) {
        return a.post.indexedAt.localeCompare(b.post.indexedAt); // oldest
      } else if (aIsByOp) {
        return -1; // op's own reply
      } else if (bIsByOp) {
        return 1; // op's own reply
      }

      const aIsBySelf = a.post.author.did === currentDid;
      const bIsBySelf = b.post.author.did === currentDid;
      if (aIsBySelf && bIsBySelf) {
        return a.post.indexedAt.localeCompare(b.post.indexedAt); // oldest
      } else if (aIsBySelf) {
        return -1; // current account's reply
      } else if (bIsBySelf) {
        return 1; // current account's reply
      }

      const af = a.post.author.viewer?.following;
      const bf = b.post.author.viewer?.following;
      if (af && !bf) {
        return -1;
      } else if (!af && bf) {
        return 1;
      }

      if (a.post.likeCount === b.post.likeCount) {
        return b.post.indexedAt.localeCompare(a.post.indexedAt); // newest
      } else {
        return (b.post.likeCount || 0) - (a.post.likeCount || 0); // most likes
      }
    });
    node.replies.forEach((reply) => sortPostThread(reply, currentDid));
  }
  return node;
}

export function createThreadSkeleton(
  node: VStreamPostThreadNode,
  currentDid: string | undefined,
): {
  parents: VStreamPostThreadNode[];
  highlightedPost: VStreamPostThreadNode;
  replies: VStreamPostThreadNode[];
} {
  return {
    parents: Array.from(flattenThreadParents(node, !!currentDid)),
    highlightedPost: node,
    replies: Array.from(flattenThreadReplies(node, currentDid)),
  };
}

function* flattenThreadParents(
  node: VStreamPostThreadNode,
  isSignedIn: boolean,
): Generator<
  Extract<VStreamPostThreadNode, { $type: "post" | "not-found" | "blocked" }>,
  void
> {
  if (node.$type === "post") {
    if (node.parent) {
      yield* flattenThreadParents(node.parent, isSignedIn);
    }
    if (!node.ctx.isHighlightedPost) {
      yield node;
    }
  } else if (node.$type === "not-found") {
    yield node;
  } else if (node.$type === "blocked") {
    yield node;
  }
}

function* flattenThreadReplies(
  node: VStreamPostThreadNode,
  currentDid: string | undefined,
): Generator<
  Extract<VStreamPostThreadNode, { $type: "post" | "not-found" | "blocked" }>,
  void
> {
  if (node.$type === "post") {
    if (!node.ctx.isHighlightedPost) {
      yield node;
    }

    if (node.replies?.length) {
      for (const reply of node.replies) {
        yield* flattenThreadReplies(reply, currentDid);
        if (!node.ctx.isHighlightedPost) {
          break;
        }
      }
    }
  } else if (node.$type === "not-found") {
    yield node;
  } else if (node.$type === "blocked") {
    yield node;
  }
}
