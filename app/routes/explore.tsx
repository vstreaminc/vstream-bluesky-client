import * as React from "react";
import {
  LoaderFunctionArgs,
  MetaDescriptor,
  MetaFunction,
} from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import useEvent from "react-use-event-hook";
import { $path } from "remix-routes";
import { MainLayout } from "~/components/mainLayout";
import { FeedPostContentText, PostMediaImage } from "~/components/post";
import { DISCOVER_FEED_URI, exploreGenerator } from "~/lib/bsky.server";
import { PRODUCT_NAME } from "~/lib/constants";
import { BooleanFilter, cn, take } from "~/lib/utils";
import { FeedViewVStreamPost } from "~/types";
import { RelativeTime } from "~/components/relativeTime";
import { Avatar, AvatarImage } from "~/components/ui/avatar";

export async function loader(args: LoaderFunctionArgs) {
  const [agent, t] = await Promise.all([
    args.context.requireLoggedInUser(),
    args.context.intl.t(),
  ]);
  const title = t.formatMessage(
    {
      defaultMessage: "Explore | {productName}",
      description: "Title for the explore page of website",
    },
    { productName: PRODUCT_NAME },
  );
  const description = t.formatMessage({
    defaultMessage:
      "Discover new and interesting posts from artists and creators",
    description: "Description for the explore page of website",
  });
  const gen = exploreGenerator((opts) =>
    agent.app.bsky.feed.getFeed({
      ...opts,
      feed: DISCOVER_FEED_URI,
    }),
  );
  const posts = await take(gen, 20);

  return { title, description, posts };
}

export const meta: MetaFunction<typeof loader> = (args) => {
  const metas: MetaDescriptor[] = [
    args.data?.title && { title: args.data.title },
    args.data?.description && {
      name: "description",
      content: args.data.description,
    },
    // TODO: Remove before going live
    { name: "robots", content: "noindex" },
  ].filter(BooleanFilter);

  return metas;
};

const MIN_ROW_HEIGHT = 200;
const MAX_ROW_HEIGHT = 400;

export default function ExplorePage() {
  const { posts } = useLoaderData<typeof loader>();

  return (
    <MainLayout>
      <div className="dark flex flex-wrap gap-4 px-6 pt-2">
        {posts.map((post) => (
          <ExploreItem key={post._reactKey} post={post} />
        ))}
      </div>
    </MainLayout>
  );
}

function ExploreItem({ post }: { post: FeedViewVStreamPost }) {
  if (!post.embed) {
    return <ExploreItemBasicPost post={post} />;
  }

  const { embed } = post;
  if ("images" in embed) {
    return <ExploreItemPostImage post={{ ...post, embed }} />;
  }

  return null;
}

function ExploreItemBasicPost({ post }: { post: FeedViewVStreamPost }) {
  return (
    <div
      className={cn(
        "cursor-pointer border-muted bg-background focus-within:bg-muted hover:bg-muted",
        "group/ExploreItem flex flex-1 basis-96 flex-col gap-1 rounded-md p-4",
      )}
      style={{
        minHeight: `${MIN_ROW_HEIGHT}px`,
      }}
    >
      <PostItem post={post}>
        <div className="relative min-h-0 flex-1 basis-0 overflow-hidden pt-4 max-md:line-clamp-5 max-md:basis-auto">
          <FeedPostContentText post={post} />
          <div className="from-background-200 group-hover/ExploreItem:from-background-300 group-focus-within/ExploreItem:from-background-300 pointer-events-none absolute bottom-0 h-9 w-full md:bg-gradient-to-t"></div>
        </div>
      </PostItem>
    </div>
  );
}

function ExploreItemPostImage({
  post,
}: {
  post: FeedViewVStreamPost & {
    embed: NonNullable<FeedViewVStreamPost["embed"]>;
  };
}) {
  const image = post.embed.images[0];
  const width = image.aspectRatio?.width ?? 1;
  const height = image.aspectRatio?.height ?? 1;
  const url = $path("/c/:username/p/:postId", {
    username: post.author.handle,
    postId: post.rkey,
  });

  return (
    <OverlayItem
      aspectRatio={width / height}
      url={url}
      overlay={
        <PostItem post={post}>
          <FeedPostContentText
            post={post}
            className="line-clamp-1 max-md:hidden"
          />
        </PostItem>
      }
    >
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
function PostItem(props: {
  post: FeedViewVStreamPost;
  children?: React.ReactNode;
}) {
  const { post } = props;

  return (
    <>
      <div className="flex items-center gap-4">
        <Avatar>
          <AvatarImage alt={post.author.displayName} src={post.author.avatar} />
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col items-start">
          <span className="max-w-full truncate text-lg font-semibold text-foreground">
            {post.author.displayName}
          </span>
          <span className="max-w-full truncate text-sm text-muted md:text-foreground">
            <RelativeTime
              value={post.createdAt}
              style="narrow"
              numeric="always"
            />
          </span>
        </div>
      </div>
      {props.children}
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
      console.log("GOT HERE", url);
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