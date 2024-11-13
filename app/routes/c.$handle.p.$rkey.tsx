import { AppBskyFeedDefs, AppBskyFeedPost } from "@atproto/api";
import { LoaderFunctionArgs, redirect, SerializeFrom } from "@remix-run/node";
import {
  Await,
  ClientLoaderFunctionArgs,
  useLoaderData,
} from "@remix-run/react";
import { Suspense } from "react";
import { FormattedDate, FormattedTime } from "react-intl";
import { $path } from "remix-routes";
import { MainLayout } from "~/components/mainLayout";
import {
  FeedPostContentText,
  FeedPostControls,
  FeedPostEmbed,
} from "~/components/post";
import { Avatar, AvatarImage } from "~/components/ui/avatar";
import { loadFeedPost } from "~/db.client";
import {
  bSkyPostFeedViewPostToVStreamPostItem,
  hydrateFeedViewVStreamPost,
  makeRecordUri,
} from "~/lib/bsky.server";

const REPLY_TREE_DEPTH = 10;

export async function loader(args: LoaderFunctionArgs) {
  const { handle, rkey } = args.params;
  if (!handle!.startsWith("@")) {
    const searchParams = new URLSearchParams(args.request.url.split("?")[1]);
    throw redirect(
      $path(
        "/c/:handle/p/:rkey",
        {
          handle: `@${handle}`,
          rkey: rkey!,
        },
        searchParams,
      ),
    );
  }
  const agent = await args.context.requireLoggedInUser();

  const uri = makeRecordUri(handle!, "app.bsky.feed.post", rkey!);

  const res = await agent.getPostThread({
    uri,
    depth: REPLY_TREE_DEPTH,
  });

  if (!AppBskyFeedDefs.isThreadViewPost(res.data.thread)) {
    throw new Response("Not found", { status: 404 });
  }

  const record = res.data.thread.post.record as AppBskyFeedPost.Record;
  const post = bSkyPostFeedViewPostToVStreamPostItem({
    post: res.data.thread.post,
    record,
  });
  const finders = {
    getProfile: (did: string) =>
      args.context.bsky.cachedFindProfile(agent, did),
  };
  await hydrateFeedViewVStreamPost(post, record, finders);

  return { thread: { post } };
}

export function clientLoader(args: ClientLoaderFunctionArgs) {
  const post = loadFeedPost(args.params.handle!, args.params.rkey!);

  if (!post) return args.serverLoader<typeof loader>();

  return { thread: { post }, serverData: args.serverLoader<typeof loader>() };
}

export default function PostPageScreen() {
  const data = useLoaderData<typeof loader | typeof clientLoader>();

  return (
    <MainLayout>
      {"serverData" in data ? (
        <Suspense
          fallback={
            <PostPage
              thread={data.thread as SerializeFrom<typeof loader>["thread"]}
            />
          }
        >
          <Await resolve={data.serverData}>
            {(data) => <PostPage {...data} />}
          </Await>
        </Suspense>
      ) : (
        <PostPage {...data} />
      )}
    </MainLayout>
  );
}

export function PostPage({ thread }: SerializeFrom<typeof loader>) {
  return (
    <div className="mx-auto w-full max-w-[37.5rem]">
      <div className="flex w-full items-center gap-4">
        <Avatar className="size-16">
          <AvatarImage src={thread.post.author.avatar} />
        </Avatar>
        <div className="flex-grow">
          <h2 className="text-lg">{thread.post.author.displayName}</h2>
          <div className="text-muted-foreground">
            {thread.post.author.handle}
          </div>
        </div>
      </div>
      <div className="pt-4">
        <FeedPostContentText post={thread.post} />
      </div>
      <FeedPostEmbed post={thread.post} />
      <div className="pb-4 pt-5 text-sm text-muted-foreground">
        <FormattedTime value={thread.post.createdAt} />
        &nbsp;&middot;&nbsp;
        <FormattedDate value={thread.post.createdAt} dateStyle="long" />
      </div>
      <FeedPostControls post={thread.post} />
    </div>
  );
}
