import { AppBskyFeedDefs, AppBskyFeedPost } from "@atproto/api";
import { LoaderFunctionArgs, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { FormattedDate, FormattedTime } from "react-intl";
import { $path } from "remix-routes";
import { MainLayout } from "~/components/mainLayout";
import {
  FeedPostContentText,
  FeedPostControls,
  FeedPostEmbed,
} from "~/components/post";
import { Avatar, AvatarImage } from "~/components/ui/avatar";
import {
  bSkyPostFeedViewPostToVStreamPostItem,
  makeRecordUri,
} from "~/lib/bsky.server";

const REPLY_TREE_DEPTH = 10;

export async function loader(args: LoaderFunctionArgs) {
  const { username, postId } = args.params;
  if (!username!.startsWith("@")) {
    const searchParams = new URLSearchParams(args.request.url.split("?")[1]);
    throw redirect(
      $path(
        "/c/:username/p/:postId",
        {
          username: `@${username}`,
          postId: postId!,
        },
        searchParams,
      ),
    );
  }
  const agent = await args.context.requireLoggedInUser();

  const uri = makeRecordUri(
    args.params.username!,
    "app.bsky.feed.post",
    args.params.postId!,
  );

  const res = await agent.getPostThread({
    uri,
    depth: REPLY_TREE_DEPTH,
  });

  if (!AppBskyFeedDefs.isThreadViewPost(res.data.thread)) {
    throw new Response("Not found", { status: 404 });
  }

  const record = res.data.thread.post.record;
  const post = bSkyPostFeedViewPostToVStreamPostItem({
    post: res.data.thread.post,
    record: record as AppBskyFeedPost.Record,
  });

  return { thread: { post } };
}

export default function PostPage() {
  const { thread } = useLoaderData<typeof loader>();

  return (
    <MainLayout>
      <div className="mx-auto max-w-[37.5rem]">
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
    </MainLayout>
  );
}
