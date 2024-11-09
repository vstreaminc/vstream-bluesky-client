import { LoaderFunctionArgs, redirect } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { $path } from "remix-routes";
import { MainLayout } from "~/components/mainLayout";
import { makeRecordUri } from "~/lib/bsky.server";

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

  return res.data;
}

export default function PostPage() {
  const { thread, threadgate } = useLoaderData<typeof loader>();

  return (
    <MainLayout>
      <pre>{JSON.stringify({ thread, threadgate }, null, 2)}</pre>
    </MainLayout>
  );
}
