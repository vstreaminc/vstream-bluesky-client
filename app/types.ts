import type { Agent } from "@atproto/api";

export type ProfileViewDetailed = Awaited<
  ReturnType<Agent["app"]["bsky"]["actor"]["getProfile"]>
>["data"];

export type ProfileViewSimple = Pick<
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
