import { AppBskyFeedDefs, type AppBskyFeedPost } from "@atproto/api";
import {
  type LoaderFunctionArgs,
  redirect,
  type SerializeFrom,
} from "@remix-run/node";
import {
  Await,
  type ClientLoaderFunctionArgs,
  useLoaderData,
} from "@remix-run/react";
import { Suspense } from "react";
import { Link } from "react-aria-components";
import { FormattedDate, FormattedTime } from "react-intl";
import { $path } from "remix-routes";
import { MainLayout } from "~/components/mainLayout";
import {
  FeedPostContentText,
  FeedPostControls,
  FeedPostEmbed,
} from "~/components/post";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { loadFeedPost } from "~/db.client";
import {
  bSkyPostFeedViewPostToVStreamPostItem,
  hydrateFeedViewVStreamPost,
  makeRecordUri,
} from "~/lib/bsky.server";
import { linkToProfile } from "~/lib/linkHelpers";

const REPLY_TREE_DEPTH = 10;

export async function loader(args: LoaderFunctionArgs) {
  const { handle, rkey } = args.params;
  if (!handle!.startsWith("@") && !handle!.startsWith("did:")) {
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
  const profileLink = linkToProfile(thread.post.author);

  return (
    <div className="mx-auto w-full max-w-[37.5rem]">
      <div className="flex w-full items-center gap-4">
        <Link href={profileLink} className="cursor-pointer">
          <Avatar className="size-16">
            <AvatarImage src={thread.post.author.avatar} />
            <AvatarFallback>@</AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-grow">
          <h2 className="text-lg">
            <Link href={profileLink} className="cursor-pointer">
              {thread.post.author.displayName}
            </Link>
          </h2>
          <div className="text-muted-foreground">
            <Link href={profileLink} className="cursor-pointer">
              {thread.post.author.handle}
            </Link>
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
