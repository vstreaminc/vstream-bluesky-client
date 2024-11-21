import type { VStreamFeedViewPost, VStreamProfileViewSimple } from "./types";

const postDB = new Map<string, VStreamFeedViewPost>();
const profileDB = new Map<string, VStreamProfileViewSimple>();

export function saveFeedPost(post: VStreamFeedViewPost): void {
  postDB.set(`${post.author.handle}:${post.rkey}`, post);
}

export function loadFeedPost(
  handle: string,
  rkey: string,
): VStreamFeedViewPost | undefined {
  return postDB.get(`${handle}:${rkey}`);
}

export function loadProfile(handleOrDid: string) {
  return profileDB.get(handleOrDid);
}

export function saveProfile(
  handleOrDid: string,
  profile: VStreamProfileViewSimple,
) {
  profileDB.set(handleOrDid, profile);
}
