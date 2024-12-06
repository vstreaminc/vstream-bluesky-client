import type { VStreamFeedViewPost } from "./types";

const postDB = new Map<string, VStreamFeedViewPost>();

export function saveFeedPost(post: VStreamFeedViewPost): void {
  postDB.set(`${post.author.handle}:${post.rkey}`, post);
}

export function loadFeedPost(handle: string, rkey: string): VStreamFeedViewPost | undefined {
  return postDB.get(`${handle}:${rkey}`);
}
