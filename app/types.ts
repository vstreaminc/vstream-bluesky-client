import type { useLoaderData } from "react-router";
import type {
  AppBskyActorDefs,
  AppBskyEmbedExternal,
  AppBskyEmbedImages,
  AppBskyEmbedVideo,
  AppBskyFeedDefs,
  AppBskyFeedPost,
} from "@atproto/api";

///// BSky re-exports

export type BskyProfileViewDetailed = AppBskyActorDefs.ProfileViewDetailed;
export type BSkyFeedViewPost = AppBskyFeedDefs.FeedViewPost;
export type BSkyPostView = AppBskyFeedDefs.PostView;
export type BskyPostRecord = AppBskyFeedPost.Record;

///// Rich Text

export type TextNode = { $type: "text"; text: string };
export type ParagraphNode = { $type: "paragraph"; nodes: RichText[] };
export type EmojiNode = {
  $type: "emoji";
  src: string;
  actionText: string;
};
export type MentionNode = {
  $type: "mention";
  handle: string;
  did: string;
};
export type HashtagNode = {
  $type: "hashtag";
  tag: string;
};
export type LinkNode = {
  $type: "link";
  text: string;
  href: string;
};
export type RichText = TextNode | ParagraphNode | EmojiNode | HashtagNode | MentionNode | LinkNode;

export type VStreamEmbedImages = {
  $type: "com.vstream.embed.images#view";
  images: (Pick<AppBskyEmbedImages.ViewImage, "thumb" | "fullsize" | "alt"> & {
    width?: number;
    height?: number;
  })[];
};

export type VStreamEmbedVideo = {
  $type: "com.vstream.embed.video#view";
  aspectRatio?: number;
} & Pick<AppBskyEmbedVideo.View, "cid" | "playlist" | "thumbnail" | "alt">;

export type VStreamEmbedExternal = {
  $type: "com.vstream.embed.external#view";
} & Pick<AppBskyEmbedExternal.ViewExternal, "uri" | "title" | "description" | "thumb">;

export type VStreamEmbedPostRecord = VStreamFeedViewPost & {
  $type: "com.vstream.embed.post#postRecord";
};

export type VStreamEmbedPostNotFound = {
  $type: "com.vstream.embed.post#postNotFound";
  uri: string;
};

export type VStreamEmbedPostBlocked = {
  $type: "com.vstream.embed.post#postBlocked";
  uri: string;
};

export type VStreamEmbedPostDetached = {
  $type: "com.vstream.embed.post#postDetached";
  uri: string;
};

export type VStreamEmbedPost = {
  $type: "com.vstream.embed.post#view";
  post:
    | VStreamEmbedPostRecord
    | VStreamEmbedPostNotFound
    | VStreamEmbedPostBlocked
    | VStreamEmbedPostDetached;
};

export type VStreamEmbedPostWithMedia = {
  $type: "com.vstream.embed.postWithMedia#view";
  media: VStreamEmbedImages | VStreamEmbedVideo | VStreamEmbedExternal;
  post: VStreamEmbedPost;
};

export type VStreamModerationDecision = {
  filter: boolean;
  blur: boolean;
  alert: boolean;
  inform: boolean;
};

export type VStreamFeedViewPost = Pick<BSkyFeedViewPost["post"], "uri" | "cid" | "indexedAt"> & {
  author: Pick<BSkyFeedViewPost["post"]["author"], "did" | "handle" | "displayName" | "avatar"> & {
    viewer?: Pick<
      NonNullable<BSkyFeedViewPost["post"]["author"]["viewer"]>,
      "muted" | "blockedBy" | "blocking" | "following" | "followedBy"
    >;
  };
  viewer?: Pick<
    NonNullable<BSkyFeedViewPost["post"]["viewer"]>,
    "repost" | "like" | "threadMuted" | "replyDisabled" | "embeddingDisabled" | "pinned"
  >;
  replyCount: number;
  repostCount: number;
  likeCount: number;
  quoteCount: number;
  rkey: string;
  embed?:
    | VStreamEmbedImages
    | VStreamEmbedVideo
    | VStreamEmbedExternal
    | VStreamEmbedPost
    | VStreamEmbedPostWithMedia;
  _reactKey: string;
  moderation?: {
    avatar: VStreamModerationDecision;
    content: VStreamModerationDecision;
    media: VStreamModerationDecision;
  };
  /**
   * Real type `BskyPostRecord["facets"]`. Typed as `unknown` to make remix okay
   * Should never need to touch underlying types unless hydrating.
   */
  facets?: object[];
  createdAt: BskyPostRecord["createdAt"];
  plainText: BskyPostRecord["text"];
  richText: RichText[];
};

export type VStreamFeedViewPostModerationTopic = keyof NonNullable<
  VStreamFeedViewPost["moderation"]
>;

// VStream types

export type VStreamProfileViewSimple = Pick<
  BskyProfileViewDetailed,
  | "avatar"
  | "banner"
  | "createdAt"
  | "description"
  | "did"
  | "displayName"
  | "followersCount"
  | "followsCount"
  | "handle"
  | "indexedAt"
  | "postsCount"
> & {
  viewer: Pick<
    AppBskyActorDefs.ViewerState,
    "muted" | "blockedBy" | "blocking" | "following" | "followedBy"
  > & {
    knownFollowers?: Pick<AppBskyActorDefs.ProfileViewBasic, "did" | "handle" | "avatar">[];
  };
};

type VStreamReasonRepost = {
  $type: "com.vstream.feed.defs#reasonRepost";
  by: Pick<AppBskyFeedDefs.ReasonRepost["by"], "did" | "handle" | "displayName" | "avatar">;
};

/**
 * Posts in feeds are grouped into "slices". A slice is 1-N related posts that
 * are threaded together in some way. Often this is to be able to show inline
 * replies to a parent thread. If there is only 1 post in the thread, there
 * is no threading going on.
 */
export type VStreamFeedViewPostSlice = {
  _reactKey: string;
  items: VStreamFeedViewPost[];
  isIncompleteThread: boolean;
  reason?: VStreamReasonRepost;
};

interface ThreadCtx {
  depth: number;
  isHighlightedPost?: boolean;
  hasMore?: boolean;
  isParentLoading?: boolean;
  isChildLoading?: boolean;
  isSelfThread?: boolean;
  hasMoreSelfThread?: boolean;
}

export type VStreamPostThreadNode =
  | VStreamPostThread
  | VStreamPostThreadNotFound
  | VStreamPostThreadBlocked
  | VStreamPostThreadUnknown;

export type VStreamPostThread = {
  $type: "post";
  _reactKey: string;
  uri: string;
  post: VStreamFeedViewPost;
  parent?: VStreamPostThreadNode;
  replies?: VStreamPostThreadNode[];
  ctx: ThreadCtx;
};

export type VStreamPostThreadNotFound = {
  $type: "not-found";
  _reactKey: string;
  uri: string;
  ctx: ThreadCtx;
};

export type VStreamPostThreadBlocked = {
  $type: "blocked";
  _reactKey: string;
  uri: string;
  ctx: ThreadCtx;
};

export type VStreamPostThreadUnknown = {
  $type: "unknown";
  uri: string;
};

/// Utilities

export type SerializeFrom<T> = ReturnType<typeof useLoaderData<T>>;
