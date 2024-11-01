import type { Agent } from "@atproto/api";

export type ProfileViewDetailed = Awaited<
  ReturnType<Agent["app"]["bsky"]["actor"]["getProfile"]>
>["data"];
