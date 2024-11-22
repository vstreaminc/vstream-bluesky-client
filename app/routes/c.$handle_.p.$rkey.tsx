import * as React from "react";
import {
  type LoaderFunctionArgs,
  type MetaFunction,
  redirect,
  type SerializeFrom,
  type MetaDescriptor,
} from "@remix-run/node";
import {
  Await,
  type ClientLoaderFunctionArgs,
  useLoaderData,
  useNavigate,
} from "@remix-run/react";
import { Suspense } from "react";
import { Link } from "react-aria-components";
import { FormattedDate, FormattedMessage, FormattedTime } from "react-intl";
import { $path } from "remix-routes";
import { useEvent } from "react-use-event-hook";
import { MainLayout } from "~/components/mainLayout";
import {
  FeedPostContent,
  FeedPostContentText,
  FeedPostControls,
  FeedPostEmbed,
  FeedPostEyebrow,
  FeedPostHeader,
} from "~/components/post";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { loadFeedPost, saveFeedPost } from "~/db.client";
import {
  createThreadSkeleton,
  hydrateFeedViewVStreamPost,
  loadPostThread,
  makeRecordUri,
  sortPostThread,
} from "~/lib/bsky.server";
import { canonicalURL, linkToPost, linkToProfile } from "~/lib/linkHelpers";
import type { VStreamFeedViewPost, VStreamPostThread } from "~/types";
import { cn } from "~/lib/utils";
import { ProfileFlyout } from "~/components/profileFlyout";
import { PRODUCT_NAME, TWITTER_HANDLE_EN } from "~/lib/constants";
import type { SupportedLocale } from "~/lib/locale";

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
  const [agent, locale] = await Promise.all([
    args.context.requireLoggedInUser(),
    args.context.intl.locale(),
  ]);

  const uri = makeRecordUri(handle!, "app.bsky.feed.post", rkey!);

  const thread = await loadPostThread(uri, (params) =>
    agent.getPostThread(params),
  );

  if (thread.$type !== "post") {
    throw new Response("Not found", { status: 404 });
  }

  const postPlainText = thread.post.plainText;

  const skeleton = createThreadSkeleton(
    sortPostThread(thread, agent.assertDid),
    agent.assertDid,
  );

  const finders = {
    getProfile: (did: string) =>
      args.context.bsky.cachedFindProfile(agent, did),
  };
  const hydrations: Promise<unknown>[] = [];
  for (const thread of [
    ...skeleton.parents,
    skeleton.highlightedPost,
    ...skeleton.replies,
  ]) {
    if (thread.$type !== "post") continue;
    hydrations.push(hydrateFeedViewVStreamPost(thread.post, finders));
  }
  await Promise.all(hydrations);

  return {
    ...skeleton,
    postPlainText,
    canonicalURL: canonicalURL(args.request.url, locale),
  };
}

export function clientLoader(args: ClientLoaderFunctionArgs) {
  const post = loadFeedPost(args.params.handle!, args.params.rkey!);

  if (!post) return args.serverLoader<typeof loader>();
  const thread: VStreamPostThread = {
    $type: "post",
    _reactKey: post.uri,
    uri: post.uri,
    post,
    ctx: { depth: 0, isHighlightedPost: true },
  };

  return {
    parents: [],
    highlightedPost: thread,
    replies: [],
    postPlainText: post.plainText,
    canonicalURL: canonicalURL(
      args.request.url,
      document.documentElement.getAttribute("lang") as SupportedLocale,
    ),
    serverData: args.serverLoader<typeof loader>(),
  } satisfies SerializeFrom<typeof loader> & { serverData: unknown };
}

export const meta: MetaFunction<typeof loader> = (args) => {
  if (!args.data) return [];
  const { highlightedPost: post, postPlainText, canonicalURL } = args.data;
  if (!post || post.$type !== "post") return [];
  const author = post.post.author;

  const postText =
    postPlainText.length > 96
      ? `${postPlainText.slice(0, 96)}...`
      : postPlainText;

  const title = [author.handle, postText, PRODUCT_NAME]
    .filter(Boolean)
    .join(" | ");

  const metas: MetaDescriptor[] = [
    { title },
    { tagName: "link", rel: "canonical", href: canonicalURL },
  ];
  const ogImage = (() => {
    if (
      !post.post.embed ||
      post.post.embed.$type !== "com.vstream.embed.images#view"
    )
      return undefined;
    return post.post.embed.images[0];
  })();
  const description = postPlainText.slice(0, 240) || ogImage?.alt.slice(0, 240);
  if (description) {
    metas.push({ description });
  }

  const ogInfo = {
    "og:description": description,
    // Show OG image of post or creator's PFP of that's missing
    "og:image": ogImage ? ogImage.fullsize : post.post.author.avatar,
    "og:site_name": PRODUCT_NAME,
    "og:title": `${author.displayName} (${author.handle}) on ${PRODUCT_NAME}`,
    "og:type": "article",
    "og:url": canonicalURL,
  };

  const twitterInfo = {
    "twitter:card": ogImage ? "summary_large_image" : "summary",
    "twitter:description": description,
    "twitter:image": ogInfo["og:image"],
    "twitter:site": TWITTER_HANDLE_EN,
    "twitter:title": ogInfo["og:title"],
  };

  for (const [property, content] of Object.entries(ogInfo)) {
    if (!content) continue;
    metas.push({ property, content });
  }

  for (const [property, content] of Object.entries(twitterInfo)) {
    if (!content) continue;
    metas.push({ property, content });
  }

  return metas;
};

export default function PostPageScreen() {
  const data = useLoaderData<typeof loader | typeof clientLoader>();

  return (
    <MainLayout>
      {"serverData" in data ? (
        <Suspense fallback={<PostPage {...data} />}>
          <Await resolve={data.serverData}>
            {(data) => <PostPage key={data.highlightedPost.uri} {...data} />}
          </Await>
        </Suspense>
      ) : (
        <PostPage key={data.highlightedPost.uri} {...data} />
      )}
    </MainLayout>
  );
}

function PostPage(data: SerializeFrom<typeof loader>) {
  const { parents, highlightedPost, replies } = data;
  const posts = React.useMemo(() => {
    return [...parents, highlightedPost, ...replies];
  }, [parents, highlightedPost, replies]);
  const highlightedPostRef = React.useRef<HTMLDivElement | null>(null);
  const didAdjustScrollWeb = React.useRef<boolean>(false);
  React.useEffect(() => {
    // only run once
    if (didAdjustScrollWeb.current) {
      return;
    }
    if (highlightedPost.$type === "post" && !!highlightedPost.parent) {
      console.log("got here");
      highlightedPostRef.current?.scrollIntoView();
      didAdjustScrollWeb.current = true;
    }
  }, [highlightedPost]);

  return (
    <div className="mx-auto w-full max-w-[37.5rem] border-x border-x-muted-foreground">
      {posts.map((item, idx) => {
        switch (item.$type) {
          case "unknown":
            return null;
          case "post": {
            if (item.ctx.isHighlightedPost) {
              return (
                <HighlightedPostPageItem
                  ref={highlightedPostRef}
                  key={item._reactKey}
                  post={item.post}
                  hasPrecedingItem={idx > 0}
                />
              );
            }
            const prev = isThreadPost(posts[idx - 1])
              ? (posts[idx - 1] as VStreamPostThread)
              : undefined;
            const next = isThreadPost(posts[idx + 1])
              ? (posts[idx + 1] as VStreamPostThread)
              : undefined;
            const showChildReplyLine = (next?.ctx.depth || 0) > item.ctx.depth;
            const showParentReplyLine =
              (item.ctx.depth < 0 && !!item.parent) || item.ctx.depth > 1;

            return (
              <PostPageItem
                key={item._reactKey}
                post={item.post}
                depth={item.ctx.depth}
                prevItem={prev}
                nextItem={next}
                showChildReplyLine={showChildReplyLine}
                showParentReplyLine={showParentReplyLine}
                hasPrecedingItem={showParentReplyLine}
                hideTopBorder={idx === 0 && !item.ctx.isParentLoading}
              />
            );
          }
          case "not-found":
            return <span key={item._reactKey}>Not found</span>;
          case "blocked":
            return <span key={item._reactKey}>Blocked</span>;
          default:
            item satisfies never;
            return null;
        }
      })}
      <div className="h-[calc(100vh-200px)] w-full border-t border-t-muted-foreground" />
    </div>
  );
}

const HighlightedPostPageItem = React.forwardRef<
  HTMLDivElement,
  { post: VStreamFeedViewPost; hasPrecedingItem: boolean }
>(function HighlightedPostPageItem({ post, hasPrecedingItem }, ref) {
  const profileLink = linkToProfile(post.author);
  const b = (nodes: React.ReactNode[]) => (
    <span className="font-bold text-foreground">{nodes}</span>
  );

  return (
    <article ref={ref} className="px-4 pb-5">
      <FeedPostEyebrow isThreadChild={hasPrecedingItem} reason={undefined} />
      <div className="flex w-full items-center gap-4">
        <ProfileFlyout profile={post.author}>
          {(hoverProps) => (
            <div {...hoverProps}>
              <Link href={profileLink}>
                <Avatar className="size-16">
                  <AvatarImage src={post.author.avatar} />
                  <AvatarFallback>@</AvatarFallback>
                </Avatar>
              </Link>
            </div>
          )}
        </ProfileFlyout>
        <div className="flex-grow">
          <h2 className="text-lg">
            <Link href={profileLink} className="cursor-pointer">
              {post.author.displayName}
            </Link>
          </h2>
          <div className="text-muted-foreground">
            <Link href={profileLink} className="cursor-pointer">
              {post.author.handle}
            </Link>
          </div>
        </div>
      </div>
      <div className="pt-4">
        <FeedPostContentText post={post} />
      </div>
      <FeedPostEmbed post={post} />
      <div className="pb-4 pt-5 text-sm text-muted-foreground">
        <FormattedTime value={post.createdAt} />
        &nbsp;&middot;&nbsp;
        <FormattedDate value={post.createdAt} dateStyle="long" />
      </div>
      {post.quoteCount > 0 || post.repostCount > 0 || post.likeCount > 0 ? (
        <div className="flex gap-4 border-y border-y-muted-foreground py-2">
          {post.repostCount > 0 ? (
            <span className="cursor-pointer text-muted-foreground">
              <FormattedMessage
                defaultMessage="{repostCount, plural, one {<b>#</b> repost} other {<b>#</b> reposts}}"
                description="Number of reposts a post has gained"
                values={{ repostCount: post.repostCount, b }}
              />
            </span>
          ) : null}
          {post.quoteCount > 0 ? (
            <span className="cursor-pointer text-muted-foreground">
              <FormattedMessage
                defaultMessage="{quoteCount, plural, one {<b>#</b> quote} other {<b>#</b> quotes}}"
                description="Number of quotes a post has gained"
                values={{ quoteCount: post.quoteCount, b }}
              />
            </span>
          ) : null}
          {post.likeCount > 0 ? (
            <span className="cursor-pointer text-muted-foreground">
              <FormattedMessage
                defaultMessage="{likeCount, plural, one {<b>#</b> like} other {<b>#</b> likes}}"
                description="Number of likes a post has gained"
                values={{ likeCount: post.likeCount, b }}
              />
            </span>
          ) : null}
        </div>
      ) : null}
      <FeedPostControls post={post} />
    </article>
  );
});

function PostPageItem(props: {
  post: VStreamFeedViewPost;
  depth: number;
  prevItem?: VStreamPostThread;
  nextItem?: VStreamPostThread;
  showChildReplyLine: boolean;
  showParentReplyLine: boolean;
  hasPrecedingItem: boolean;
  hideTopBorder: boolean;
}) {
  const { post } = props;
  const url = linkToPost(post);
  const navigate = useNavigate();
  const ref = React.useRef<HTMLElement | null>(null);
  const onClick = useEvent<React.MouseEventHandler<HTMLElement>>((event) => {
    if (
      event.target instanceof HTMLElement &&
      // The target isn't an anchor/button/form or inside one
      !event.target.closest("a") &&
      !event.target.closest("button") &&
      !event.target.closest("form") &&
      // The target isn't inside the user flyout / popover
      !event.target.closest(".react-aria-Popover") &&
      // The target isn't inside a dialog
      !event.target.closest("[role=dialog]") &&
      // The target isn't the black overlay behind modals
      !event.target.closest(".fixed.inset-0")
    ) {
      // If we click a post inside a quote, don't bubble up to the wider
      // quoted post
      event.stopPropagation();
      navigate(url);
    }
  });

  const onKeyUp = useEvent<React.KeyboardEventHandler<HTMLElement>>((event) => {
    if (event.key !== "Enter") return;
    if (event.target === ref.current) {
      // If the current target is the container
      navigate(url);
    }
  });

  React.useEffect(() => {
    // Save the post in local client DB for fast loading later
    saveFeedPost(post);
  }, [post]);

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <article
      ref={ref}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      onClick={onClick}
      onKeyUp={onKeyUp}
      className={cn(
        "cursor-pointer border-t border-t-muted-foreground px-4 hover:bg-muted",
        {
          "pb-5": !props.showChildReplyLine,
          "border-t-0":
            props.hideTopBorder ||
            (props.showParentReplyLine && props.hasPrecedingItem),
        },
      )}
    >
      <FeedPostEyebrow
        isThreadChild={props.showParentReplyLine}
        reason={undefined}
      />
      <div className="flex gap-4">
        <div className="flex w-[3.25rem] flex-col">
          <ProfileFlyout profile={post.author}>
            {(hoverProps) => (
              <div {...hoverProps}>
                <Link href={linkToProfile(post.author)}>
                  <Avatar className="aspect-square h-auto w-full">
                    <AvatarImage
                      src={post.author.avatar}
                      alt={post.author.displayName}
                    />
                    <AvatarFallback>@</AvatarFallback>
                  </Avatar>
                </Link>
              </div>
            )}
          </ProfileFlyout>
          {/* Line connecting related posts */}
          {props.showChildReplyLine && (
            <div className="mx-auto mt-1 w-0.5 grow bg-muted-foreground" />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <FeedPostHeader post={post} />
          <FeedPostContent post={post} />
          <FeedPostEmbed post={post} />
          <FeedPostControls post={post} />
        </div>
      </div>
    </article>
  );
}

function isThreadPost(v: unknown): v is VStreamPostThread {
  return !!v && typeof v === "object" && "$type" in v && v.$type === "post";
}
