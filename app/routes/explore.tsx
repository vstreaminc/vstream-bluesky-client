import * as React from "react";
import { useFetcher, useNavigate, type MetaDescriptor } from "react-router";
import { useEvent } from "react-use-event-hook";
import { SECOND } from "@atproto/common";
import { $path } from "safe-routes";
import { MainLayout } from "~/components/mainLayout";
import { FeedPostContentText, FeedPostControls, PostMediaImage } from "~/components/post";
import { DISCOVER_FEED_URI, exploreGenerator, hydrateFeedViewVStreamPost } from "~/lib/bsky.server";
import { PRODUCT_NAME } from "~/lib/constants";
import { BooleanFilter, cn, take } from "~/lib/utils";
import type { VStreamEmbedImages, VStreamFeedViewPost } from "~/types";
import { RelativeTime } from "~/components/relativeTime";
import { Avatar, AvatarImage } from "~/components/ui/avatar";
import { saveFeedPost } from "~/db.client";
import { useImageShadows } from "~/hooks/useImgShadow";
import { hrefLangs, linkToPost, linkToProfile } from "~/lib/linkHelpers";
import { ObserverLoader } from "~/components/observer";
import { ProfileFlyout } from "~/components/profileFlyout";
import { UnstyledLink } from "~/components/ui/link";
import type { Route } from "./+types/explore";

export type SearchParams = {
  cursor?: string;
};

export async function loader(args: Route.LoaderArgs) {
  const [agent, t] = await Promise.all([args.context.requireLoggedInUser(), args.context.intl.t()]);
  const moderationOpts = await args.context.bsky.cachedModerationOpts(agent);
  const title = t.formatMessage(
    {
      defaultMessage: "Explore | {productName}",
      description: "Title for the explore page of website",
    },
    { productName: PRODUCT_NAME },
  );
  const description = t.formatMessage({
    defaultMessage: "Discover new and interesting posts from artists and creators",
    description: "Description for the explore page of website",
  });
  const cursorFromQuery =
    new URLSearchParams(args.request.url.split("?")[1]).get("cursor") ?? undefined;
  async function getExplorePosts(cursor?: string) {
    const gen = exploreGenerator(
      (opts) =>
        agent.app.bsky.feed.getFeed({
          ...opts,
          feed: DISCOVER_FEED_URI,
        }),
      {
        initalCusor: cursor,
        moderationOpts,
      },
    );
    const posts = await take(gen, 20);
    const finders = {
      getProfile: (did: string) => args.context.bsky.cachedFindProfile(agent, did),
    };
    await Promise.all(posts.map((post) => hydrateFeedViewVStreamPost(post, finders)));
    return { posts, cursor: gen.cursor };
  }
  const { posts, cursor } = await (cursorFromQuery
    ? getExplorePosts(cursorFromQuery)
    : // Only cache when no cursor
      (await args.context.cache()).getOrSet("explorePosts", getExplorePosts, {
        expiresIn: 10 * SECOND,
        staleWhileRevalidate: 50 * SECOND,
      }));

  return {
    title,
    description,
    posts,
    cursor,
    hrefLangs: hrefLangs(args.request.url),
  };
}

export const meta: Route.MetaFunction = (args) => {
  const metas: MetaDescriptor[] = [
    args.data?.title && { title: args.data.title },
    args.data?.description && {
      name: "description",
      content: args.data.description,
    },
    // TODO: Remove before going live
    { name: "robots", content: "noindex" },
    ...(args.data?.hrefLangs ?? []).map(({ locale, href }) => ({
      tagName: "link",
      rel: "alternate",
      hrefLang: locale,
      href,
    })),
  ].filter(BooleanFilter);

  return metas;
};

const MIN_ROW_HEIGHT = 200;
const MAX_ROW_HEIGHT = 400;

export default function ExplorePage({ loaderData: serverData }: Route.ComponentProps) {
  const [posts, setPosts] = React.useState(serverData.posts);
  const [cursor, setCursor] = React.useState(serverData.cursor);
  const { data, load } = useFetcher<typeof loader>({ key: `explore-feed` });
  const fetchedCountRef = React.useRef(-1);

  const count = posts.length;
  const hasMore = !!cursor && fetchedCountRef.current < count;
  const loadMore = useEvent(async () => {
    if (fetchedCountRef.current < count) {
      load($path("/explore", { cursor }));
    }
  });

  React.useEffect(() => {
    if (!data) return;
    setCursor(data.cursor);
    setPosts((posts) => [...posts, ...data.posts]);
  }, [data]);

  return (
    <MainLayout>
      <div className="dark flex flex-wrap gap-4 px-6 pt-2">
        {posts.map((post) => (
          <ExploreItem key={post._reactKey} post={post} />
        ))}
        <ObserverLoader onLoad={loadMore} shouldLoad={hasMore} margin="200px" />
      </div>
    </MainLayout>
  );
}

const ExploreItem = React.memo(function ExploreItem({ post }: { post: VStreamFeedViewPost }) {
  React.useEffect(() => {
    saveFeedPost(post);
  }, [post]);

  if (!post.embed) {
    return <ExploreItemBasicPost post={post} />;
  }

  const { embed } = post;
  if ("images" in embed) {
    return <ExploreItemPostImage post={{ ...post, embed }} />;
  }

  return null;
});

function ExploreItemBasicPost({ post }: { post: VStreamFeedViewPost }) {
  const url = linkToPost(post);
  const indirectLinkProps = useIndirectLink<HTMLDivElement>(url);

  return (
    <div
      className={cn(
        "cursor-pointer border-muted bg-background focus-within:bg-muted hover:bg-muted",
        "group/ExploreItem flex flex-1 basis-96 flex-col gap-1 rounded-md p-4",
      )}
      style={{
        minHeight: `${MIN_ROW_HEIGHT}px`,
      }}
      {...indirectLinkProps}
    >
      <PostItem post={post}>
        <div className="relative min-h-0 flex-1 basis-0 overflow-hidden pt-4 max-md:basis-auto">
          <FeedPostContentText post={post} className="max-md:line-clamp-5" />
          <div className="from-background-200 group-hover/ExploreItem:from-background-300 group-focus-within/ExploreItem:from-background-300 pointer-events-none absolute bottom-0 h-9 w-full md:bg-gradient-to-t"></div>
        </div>
      </PostItem>
    </div>
  );
}

function ExploreItemPostImage({
  post,
}: {
  post: VStreamFeedViewPost & {
    embed: NonNullable<VStreamEmbedImages>;
  };
}) {
  const image = post.embed.images[0];
  const [shadow] = useImageShadows(image.fullsize);
  const width = shadow.width ?? image.width ?? 1;
  const height = shadow.height ?? image.height ?? 1;
  const url = linkToPost(post);

  return (
    <OverlayItem aspectRatio={width / height} url={url} overlay={<PostItem post={post} />}>
      <div style={{ aspectRatio: `${width / height}` }}>
        <PostMediaImage
          fullsizeSrc={image.fullsize}
          thumbSrc={image.thumb}
          alt={image.alt}
          width={width}
          height={height}
        />
      </div>
    </OverlayItem>
  );
}

/* Internal helper components & hooks */
function PostItem(props: { post: VStreamFeedViewPost; children?: React.ReactNode }) {
  const { post } = props;

  return (
    <>
      <div className="flex items-center gap-4">
        <ProfileFlyout profile={post.author}>
          {(hoverProps) => (
            <div {...hoverProps}>
              <UnstyledLink href={linkToProfile(post.author)}>
                <Avatar>
                  <AvatarImage src={post.author.avatar} alt={post.author.displayName} />
                </Avatar>
              </UnstyledLink>
            </div>
          )}
        </ProfileFlyout>
        <div className="min-w-0 flex-1">
          <ProfileFlyout profile={post.author}>
            {(hoverProps) => (
              <div
                className="max-w-full truncate text-lg font-semibold text-foreground"
                {...hoverProps}
              >
                <UnstyledLink href={linkToProfile(post.author)}>
                  {post.author.displayName}
                </UnstyledLink>
              </div>
            )}
          </ProfileFlyout>
          <div className="max-w-full truncate text-sm text-muted md:text-foreground">
            <RelativeTime value={post.createdAt} style="narrow" numeric="always" />
          </div>
        </div>
      </div>
      {props.children}
      <FeedPostControls post={post} />
    </>
  );
}

function OverlayItem(props: {
  aspectRatio: number;
  overlay: React.ReactNode;
  url: string;
  children?: React.ReactNode;
}) {
  const indirectLinkProps = useIndirectLink<HTMLDivElement>(props.url);

  return (
    <div
      className={cn(
        // On mobile we stop caring about keeping a strict size and just want to fill the device width
        "max-md:!aspect-[auto] max-md:!max-w-none max-md:!flex-shrink",
        "bg-transparent-black group/ExploreItem relative overflow-hidden rounded-md",
        "cursor-pointer",
      )}
      style={{
        aspectRatio: `${props.aspectRatio}`,
        flex: `${100 * props.aspectRatio} 0 ${props.aspectRatio * MIN_ROW_HEIGHT}px`,
        maxWidth: `min(100%, ${props.aspectRatio * MAX_ROW_HEIGHT}px)`,
      }}
      {...indirectLinkProps}
    >
      {props.children}
      <div
        className={cn(
          "flex w-full flex-col justify-end gap-1 p-4 pb-3 md:h-44",
          "bg-gradient-to-t from-[#201F2F]/95 from-40% via-[#201F2F]/70 via-75%",
          "md:opacity-0 md:transition-opacity md:group-focus-within/ExploreItem:opacity-100 md:group-hover/ExploreItem:opacity-100",
          // On mobile this is an element below the image with a background. On desktop this is a hoverable overlay ontop of the image.
          "max-md:bg-background-200 bottom-0 md:absolute",
          // This is a mildly evil hack to let users click "through" the overlay onto the image link below, but still be able to click links/buttons in the overlay
          "pointer-events-none [&_a]:pointer-events-auto [&_button]:pointer-events-auto",
        )}
      >
        {props.overlay}
      </div>
    </div>
  );
}

function useIndirectLink<T extends HTMLElement>(url: string) {
  const ref = React.useRef<T>(null);
  const navigate = useNavigate();
  const onClick = useEvent<React.MouseEventHandler<T>>((event) => {
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

  const onKeyUp = useEvent<React.KeyboardEventHandler<T>>((event) => {
    if (event.key !== "Enter") return;
    if (event.target === ref.current) {
      // If the current target is the container
      navigate(url);
    }
  });

  return {
    ref,
    onClick,
    onKeyUp,
    tabIndex: 0,
    role: "link",
  } as const;
}
