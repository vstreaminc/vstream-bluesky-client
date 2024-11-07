import {
  FeedViewPost,
  ProfileViewDetailed,
  ProfileViewVStreamSimple,
  FeedViewVStreamPostSlice,
} from "~/types";
import { FeedTuner, FeedViewPostsSlice } from "./feedTuner";

export function profiledDetailedToSimple(
  profile: ProfileViewDetailed,
): ProfileViewVStreamSimple {
  return {
    avatar: profile.avatar,
    banner: profile.banner,
    createdAt: profile.createdAt,
    description: profile.description,
    did: profile.did,
    displayName: profile.displayName,
    followersCount: profile.followersCount,
    followsCount: profile.followsCount,
    handle: profile.handle,
    indexedAt: profile.indexedAt,
    postsCount: profile.postsCount,
  };
}

function bSkySliceToVStreamSlice(
  slice: FeedViewPostsSlice,
): FeedViewVStreamPostSlice {
  return {
    _reactKey: slice._reactKey,
    isIncompleteThread: slice.isIncompleteThread,
    items: slice.items.map((item) => ({
      uri: item.post.uri,
      cid: item.post.cid,
      replyCount: item.post.replyCount,
      repostCount: item.post.repostCount,
      likeCount: item.post.likeCount,
      quoteCount: item.post.quoteCount,
      indexedAt: item.post.indexedAt,
      viewer: item.post.viewer,
      author: {
        did: item.post.author.did,
        handle: item.post.author.handle,
        displayName: item.post.author.displayName,
        avatar: item.post.author.avatar,
        viewer: item.post.author.viewer,
      },
      createdAt: item.record.createdAt,
      plainText: item.record.text,
      // TODO: Handle this
      richText: [],
    })),
  };
}

export async function* feedGenerator(
  fn: (options?: {
    cursor?: string;
    limit?: number;
  }) => Promise<{ data: { cursor?: string; feed: FeedViewPost[] } }>,
  userDid: string,
  initalCusor?: string,
): AsyncIterableIterator<FeedViewVStreamPostSlice> {
  const tuner = new FeedTuner([
    FeedTuner.removeOrphans,
    FeedTuner.followedRepliesOnly({ userDid }),
    FeedTuner.dedupThreads,
  ]);

  let cursor = initalCusor;
  do {
    const res = await fn({ cursor, limit: 100 });
    cursor = res.data.cursor;
    const slices = tuner.tune(res.data.feed);

    yield* slices.map(bSkySliceToVStreamSlice);
  } while (cursor);
}
