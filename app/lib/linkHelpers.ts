import { $path } from "remix-routes";

const INVALID_HANDLE = "handle.invalid";

type Author = {
  did: string;
  handle: string;
};

function handleOrDid<T extends Author>(author: T): string {
  return author.handle.endsWith(INVALID_HANDLE) ? author.did : author.handle;
}

export function linkToProfile<T extends Author>(author: T): string {
  return $path("/c/:handle", { handle: handleOrDid(author) });
}

export function linkToPost<T extends { rkey: string; author: Author }>(
  post: T,
): string {
  return $path("/c/:handle/p/:rkey", {
    handle: handleOrDid(post.author),
    rkey: post.rkey,
  });
}
