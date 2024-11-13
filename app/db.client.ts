import type { FeedViewVStreamPost } from "./types";

const postDB = new Map<string, FeedViewVStreamPost>();

export function saveFeedPost(post: FeedViewVStreamPost): void {
  postDB.set(`${post.author.handle}:${post.rkey}`, post);
}

export function loadFeedPost(
  handle: string,
  rkey: string,
): FeedViewVStreamPost | undefined {
  return postDB.get(`${handle}:${rkey}`);
}
