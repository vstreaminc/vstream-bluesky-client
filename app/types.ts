import type {
  AppBskyActorDefs,
  AppBskyEmbedImages,
  AppBskyFeedDefs,
  AppBskyFeedPost,
} from "@atproto/api";

export type BskyProfileViewDetailed = AppBskyActorDefs.ProfileViewDetailed;

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
>;

export type BSkyFeedViewPost = AppBskyFeedDefs.FeedViewPost;
export type BSkyPostView = AppBskyFeedDefs.PostView;
export type BskyPostRecord = AppBskyFeedPost.Record;

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

export type VStreamFeedViewPost = Pick<
  BSkyFeedViewPost["post"],
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
    BSkyFeedViewPost["post"]["author"],
    "did" | "handle" | "displayName" | "avatar"
  > & {
    viewer?: Omit<
      BSkyFeedViewPost["post"]["author"]["viewer"],
      "blockingByList" | "mutedByList"
    >;
  };
  rkey: string;
  embed?: AppBskyEmbedImages.View;
  _reactKey: string;
  createdAt: BskyPostRecord["createdAt"];
  plainText: BskyPostRecord["text"];
  richText: RichText[];
};

type VStreamReasonRepost = {
  $type: "com.vstream.feed.defs#reasonRepost";
  by: Pick<
    AppBskyFeedDefs.ReasonRepost["by"],
    "did" | "handle" | "displayName" | "avatar"
  >;
};

export type VStreamFeedViewPostSlice = {
  _reactKey: string;
  items: VStreamFeedViewPost[];
  isIncompleteThread: boolean;
  reason?: VStreamReasonRepost;
};
