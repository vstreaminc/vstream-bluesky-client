import type {
  AppBskyActorDefs,
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

export type TextNode = { type: "text"; text: string };
export type ParagraphNode = { type: "paragraph"; nodes: RichText[] };
export type InlineImageNode = {
  type: "inline-image";
  src: string;
  alt: string | null;
};
export type RichText = TextNode | ParagraphNode | InlineImageNode;

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
} & {
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
