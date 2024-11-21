import { $path } from "remix-routes";
import { handleOrDid } from "./utils";

export function linkToProfile<T extends { handle: string; did: string }>(
  author: T,
): string {
  return $path("/c/:handle", { handle: handleOrDid(author) });
}

export function linkToPost<
  T extends { rkey: string; author: { handle: string; did: string } },
>(post: T): string {
  return $path("/c/:handle/p/:rkey", {
    handle: handleOrDid(post.author),
    rkey: post.rkey,
  });
}
