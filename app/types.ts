import type {
  AppBskyActorDefs,
  AppBskyEmbedImages,
  AppBskyFeedDefs,
  AppBskyFeedPost,
} from "@atproto/api";

export type ProfileViewDetailed = AppBskyActorDefs.ProfileViewDetailed;

export type ProfileViewVStreamSimple = Pick<
  ProfileViewDetailed,
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
>;

export type FeedViewPost = AppBskyFeedDefs.FeedViewPost;
export type PostView = AppBskyFeedDefs.PostView;
export type PostRecord = AppBskyFeedPost.Record;

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
export type RichText =
  | TextNode
  | ParagraphNode
  | EmojiNode
  | HashtagNode
  | MentionNode
  | LinkNode;

export type FeedViewVStreamPost = Pick<
  FeedViewPost["post"],
  | "uri"
  | "cid"
  | "replyCount"
  | "repostCount"
  | "likeCount"
  | "quoteCount"
  | "indexedAt"
  | "viewer"
> & {
  author: Pick<
    FeedViewPost["post"]["author"],
    "did" | "handle" | "displayName" | "avatar"
  > & {
    viewer?: Omit<
      FeedViewPost["post"]["author"]["viewer"],
      "blockingByList" | "mutedByList"
    >;
  };
  rkey: string;
  embed?: AppBskyEmbedImages.View;
  _reactKey: string;
  createdAt: PostRecord["createdAt"];
  plainText: PostRecord["text"];
  richText: RichText[];
};

type ReasonRepostVStream = {
  $type: "com.vstream.feed.defs#reasonRepost";
  by: Pick<
    AppBskyFeedDefs.ReasonRepost["by"],
    "did" | "handle" | "displayName" | "avatar"
  >;
};

export type FeedViewVStreamPostSlice = {
  _reactKey: string;
  items: FeedViewVStreamPost[];
  isIncompleteThread: boolean;
  reason?: ReasonRepostVStream;
};
