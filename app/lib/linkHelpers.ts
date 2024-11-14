import { $path } from "remix-routes";

const INVALID_HANDLE = "handle.invalid";

export function linkToPost<
  T extends { rkey: string; author: { did: string; handle: string } },
>(post: T): string {
  const handleOrDid = post.author.handle.endsWith(INVALID_HANDLE)
    ? post.author.did
    : post.author.handle;

  return $path("/c/:handle/p/:rkey", {
    handle: handleOrDid,
    rkey: post.rkey,
  });
}
