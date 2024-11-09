import * as React from "react";
import { FormattedMessage } from "react-intl";
import { Heart, RefreshCcw, Repeat, Undo2 } from "lucide-react";
import useEvent from "react-use-event-hook";
import type { FeedViewVStreamPost, FeedViewVStreamPostSlice } from "~/types";
import { cn } from "~/lib/utils";
import { Avatar, AvatarImage } from "~/components/ui/avatar";
import { RelativeTime } from "~/components/relativeTime";
import { ImageMosaic } from "~/components/imageMosaic";
import { ManualDialogTrigger } from "./ui/dialog";
import { useHydrated } from "~/hooks/useHydrated";
import { useDevicePixelRatio } from "~/hooks/useDevicePixelRatio";
import { useDimensions } from "~/hooks/useDimensions";
import { Slider } from "./slider";
import { Button, PressEvent } from "react-aria-components";
import { $path } from "remix-routes";
import { useNavigate } from "@remix-run/react";

/**
 * Main component for rendering slices in the feed
 */
export const FeedSlice = React.memo(function FeedSlice({
  slice,
  hideTopBorder,
}: {
  slice: FeedViewVStreamPostSlice;
  hideTopBorder?: boolean;
}) {
  if (slice.isIncompleteThread && slice.items.length >= 3) {
    return <div>TODO: Incompete thread</div>;
  }
  return (
    <>
      {slice.items.map((item, i) => (
        <FeedPost
          key={item._reactKey}
          post={slice.items[i]}
          reason={i === 0 ? slice.reason : undefined}
          isThreadParent={isThreadParentAt(slice.items, i)}
          isThreadChild={isThreadChildAt(slice.items, i)}
          isThreadLastChild={
            isThreadChildAt(slice.items, i) && slice.items.length === i + 1
          }
          hideTopBorder={hideTopBorder && i === 0}
          rootPost={slice.items[0]}
        />
      ))}
    </>
  );
});

type FeedPostProps = {
  post: FeedViewVStreamPost;
  reason: FeedViewVStreamPostSlice["reason"];
  isThreadParent: boolean;
  isThreadChild: boolean;
  isThreadLastChild: boolean;
  hideTopBorder?: boolean;
  rootPost: FeedViewVStreamPost;
};
export function FeedPost(props: FeedPostProps) {
  const { post } = props;
  const url = $path("/c/:username/p/:postId", {
    username: props.post.author.handle,
    postId: props.post.rkey,
  });
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

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <article
      ref={ref}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      onClick={onClick}
      onKeyUp={onKeyUp}
      className={cn("cursor-pointer px-4 hover:bg-muted", {
        "pb-5":
          props.isThreadLastChild ||
          (!props.isThreadChild && !props.isThreadParent),
        "border-t border-t-muted-foreground":
          !props.hideTopBorder && !props.isThreadChild,
      })}
    >
      <FeedPostEyebrow
        isThreadChild={props.isThreadChild}
        reason={props.reason}
      />
      <div className="flex gap-4">
        <div className="flex w-[3.25rem] flex-col">
          <Avatar className="h-auto w-full">
            <AvatarImage
              src={post.author.avatar}
              alt={post.author.displayName}
            />
          </Avatar>
          {/* Line connecting related posts */}
          {props.isThreadParent && (
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

function FeedPostEyebrow({
  isThreadChild,
  reason,
}: {
  isThreadChild: boolean;
  reason: FeedViewVStreamPostSlice["reason"];
}) {
  return (
    <div className="flex gap-4">
      <div className="flex w-[3.25rem] flex-col">
        {/* Line connecting related posts */}
        {isThreadChild && (
          <div className="mx-auto mb-1 w-0.5 grow bg-muted-foreground" />
        )}
      </div>
      <div className="flex min-w-0 shrink pt-5">
        {reason && reason.$type === "com.vstream.feed.defs#reasonRepost" ? (
          <div className="-ml-6 flex min-w-0 items-center pb-0.5 text-sm">
            <RefreshCcw size={20} className="mr-1" />
            <span className="truncate">
              <FormattedMessage
                defaultMessage="Reposted by {name}"
                description="Header of a post letting someone know who it was reposted by"
                values={{ name: reason.by.displayName }}
              />
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FeedPostHeader({ post }: { post: FeedViewVStreamPost }) {
  return (
    <>
      <div className="truncate pb-0.5">
        <span className="font-sm">{post.author.displayName}</span>&nbsp;
        <span className="text-muted-foreground">@{post.author.handle}</span>
      </div>
      <div className="text-sm text-muted-foreground">
        <RelativeTime value={post.createdAt} />
      </div>
    </>
  );
}

function FeedPostContent({ post }: { post: FeedViewVStreamPost }) {
  return (
    <div className="mt-2">
      <FeedPostContentText post={post} />
    </div>
  );
}

export function FeedPostContentText({
  post,
  className,
}: {
  post: FeedViewVStreamPost;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "leading-6 text-foreground [word-break:break-word]",
        className,
      )}
    >
      {post.plainText}
    </span>
  );
}

function FeedPostEmbed({ post }: { post: FeedViewVStreamPost }) {
  if (!post.embed) return null;

  const images = post.embed.images.map((i) => ({
    ...i,
    id: i.fullsize,
    width: i.aspectRatio?.width ?? 1,
    height: i.aspectRatio?.height ?? 1,
    aspectRatio: (i.aspectRatio?.width ?? 1) / (i.aspectRatio?.height ?? 1),
  }));

  return (
    <div className="mt-2">
      <ImageMosaic
        className="max-h-96 sm:max-h-[36rem]"
        items={images}
        render={(image, idx) => (
          <ManualDialogTrigger className="h-full max-h-full w-full max-w-full overflow-visible bg-transparent shadow-[none]">
            {({ open }) => (
              <PostMediaImage
                className="rounded-sm"
                thumbSrc={image.thumb}
                fullsizeSrc={image.fullsize}
                alt={image.alt}
                width={image.width}
                height={image.height}
                onPress={open}
                thumbnail
              />
            )}
            {() => <PostMediaImagesModal startIdx={idx} images={images} />}
          </ManualDialogTrigger>
        )}
      />
    </div>
  );
}

export function FeedPostControls({ post }: { post: FeedViewVStreamPost }) {
  return (
    <div className="flex items-center justify-between pt-2">
      <div className="flex-1 items-start">
        <button className="flex items-center justify-center gap-1 rounded-full p-1 hover:bg-muted-foreground">
          <Undo2 className="size-4" color="hsl(var(--secondary))" />
          {typeof post.replyCount === "number" && post.replyCount > 0 ? (
            <span className="text-sm text-muted">{post.replyCount}</span>
          ) : null}
        </button>
      </div>
      <div className="flex-1 items-start">
        <button className="flex items-center justify-center gap-1 rounded-full p-1 hover:bg-muted-foreground">
          <Repeat className="size-4" color="hsl(var(--secondary))" />
          {typeof post.repostCount === "number" && post.repostCount > 0 ? (
            <span className="text-sm text-muted">{post.repostCount}</span>
          ) : null}
        </button>
      </div>
      <div className="flex-1 items-start">
        <button className="flex items-center justify-center gap-1 rounded-full p-1 hover:bg-muted-foreground">
          <Heart className="size-4" color="hsl(var(--secondary))" />
          {typeof post.likeCount === "number" && post.likeCount > 0 ? (
            <span className="text-sm text-muted">{post.likeCount}</span>
          ) : null}
        </button>
      </div>
    </div>
  );
}

export function PostMediaImage(props: {
  className?: string;
  thumbSrc: string;
  fullsizeSrc: string;
  alt?: string;
  width: number;
  height: number;
  thumbnail?: boolean;
  noUpscale?: boolean;
  onPress?: (e: PressEvent) => void;
}) {
  // Track whether we are server-side-rendering or not
  // Since we don't set blurSrc until client-side hydration, we use this to show the preview/primary image
  // as it loads in, which matches expected browser behavior. This improves user experience on slow connections
  // where the images may load faster than the javascript.
  const hydrated = useHydrated();

  // Track the state of the primary image and whether to show it
  // We always want to prefer the primary image if it's set and fully loaded
  const [showImage, setLoaded] = React.useState(false);

  // SSR sends down the img tag with src already set, allowing the browser to download and render
  // the image before JS hydration finishes. This manually checks that case and correctly updates loaded.
  const imgRef = React.useRef<HTMLImageElement | null>(null);
  const onMount = useEvent((img: HTMLImageElement | null) => {
    if (img?.complete) {
      setLoaded(true);
    }
    imgRef.current = img;
  });
  // Otherwise if the image is still loading, or the image was rendered client-side, we listen for onLoad as you'd expect
  const onLoad = useEvent(() => {
    setLoaded(true);
  });
  // When src changes we need to re-blur the image, but we also need to avoid re-bluring after hydration
  React.useEffect(() => {
    if (props.fullsizeSrc !== imgRef.current?.src) {
      setLoaded(false);
    }
  }, [props.fullsizeSrc]);

  // Track the state of the preview image and whether to show it
  // Only show preview if it's set and the primary image hasn't loaded in yet
  // Or if we are pre-hydration, since the preview will likely load faster
  const [previewLoaded, setPreviewLoaded] = React.useState(false);
  const showPreviewImage = React.useMemo(
    () => !showImage && (previewLoaded || !hydrated),
    [showImage, previewLoaded, hydrated],
  );
  // SSR sends down the img tag with src already set, allowing the browser to download and render
  // the image before JS hydration finishes. This manually checks that case and correctly updates previewLoaded.
  const previewRef = React.useRef<HTMLImageElement | null>(null);
  const onPreviewMount = useEvent((img: HTMLImageElement | null) => {
    if (img?.complete) {
      setPreviewLoaded(true);
    }
    previewRef.current = img;
  });
  // Otherwise if the image is still loading, or the image was rendered client-side, we listen for onLoad as you'd expect
  const onPreviewLoad = useEvent(() => {
    setPreviewLoaded(true);
  });
  // When previewSrc changes we need to re-blur the image, but we also need to avoid re-bluring after hydration
  React.useEffect(() => {
    if (props.thumbSrc !== previewRef.current?.src) {
      setPreviewLoaded(false);
    }
  }, [props.thumbSrc]);

  // Use props.width and parse the image URLs to determine the maximum native resolution of the biggest image
  // We then use this in the styling to ensure we don't upscale the image if `props.noUpscale` is set
  const dpr = useDevicePixelRatio();
  const maxWidth = props.width / dpr;
  const maxHeight = (maxWidth / props.width) * props.height;

  // Track the aspect ratio of the container so we know whether to scale based on width or height
  const dim = useDimensions();
  const onContainerMount = useEvent((div: HTMLElement | null) => {
    dim.observe(div ?? undefined);
  });
  const primaryDimension = React.useMemo(() => {
    const containerAR = dim.width / (dim.height || 1);
    const imageAR = props.width / props.height;
    return containerAR > imageAR ? ("height" as const) : ("width" as const);
  }, [dim.width, dim.height, props.width, props.height]);

  return (
    <div
      ref={onContainerMount}
      className={cn(
        "grid h-full w-full place-items-center overflow-hidden",
        props.className,
      )}
    >
      <Button
        className={cn(
          "relative isolate min-h-0 min-w-0",
          primaryDimension === "width" &&
            "h-auto w-full min-w-[min(100%,48rem)]",
          primaryDimension === "height" &&
            "h-full min-h-[min(100%,24rem)] w-auto",
        )}
        style={{
          aspectRatio: `${props.width} / ${props.height}`,
          maxWidth:
            props.noUpscale && primaryDimension === "width"
              ? maxWidth
              : undefined,
          maxHeight:
            props.noUpscale && primaryDimension === "height"
              ? maxHeight
              : undefined,
        }}
        onPress={props.onPress}
      >
        <img
          ref={onMount}
          onLoad={onLoad}
          src={props.fullsizeSrc}
          alt={props.alt}
          width={props.width}
          height={props.height}
          className={cn(
            "h-full w-full",
            "opacity-0 transition-opacity ease-linear",
            showImage && "opacity-100",
          )}
          loading="lazy"
          decoding="async"
        />
        <img
          ref={onPreviewMount}
          onLoad={onPreviewLoad}
          src={props.thumbSrc}
          alt={props.alt}
          width={props.width}
          height={props.height}
          className={cn(
            "h-full w-full",
            "pointer-events-none absolute inset-0 mix-blend-plus-lighter",
            "opacity-0 transition-opacity ease-linear",
            showPreviewImage && "opacity-100",
          )}
          loading="lazy"
          decoding="async"
        />
      </Button>
    </div>
  );
}

function PostMediaImagesModal(props: {
  images: {
    id: string;
    width: number;
    height: number;
    aspectRatio: number;
    thumb: string;
    fullsize: string;
    alt: string;
  }[];
  startIdx: number;
}) {
  const imageNodes = props.images.map((image) => {
    return (
      <React.Fragment key={image.id}>
        <div className="row-start-1 min-h-0 min-w-0 snap-center snap-always px-8 md:px-14">
          <PostMediaImage
            thumbSrc={image.thumb}
            fullsizeSrc={image.fullsize}
            alt={image.alt}
            width={image.width}
            height={image.height}
            noUpscale
          />
        </div>
        <span className="row-start-2 mt-4 max-w-full justify-self-center break-words px-8 text-foreground md:px-14">
          {image.alt}
        </span>
      </React.Fragment>
    );
  });

  return (
    <Slider
      containerClassName="h-full"
      contentClassName="-mx-6"
      nodes={imageNodes}
      startIndex={props.startIdx}
      leftNavClassName="fixed"
      rightNavClassName="fixed"
      enableHotKeys
    />
  );
}

function isThreadParentAt<T>(arr: Array<T>, i: number) {
  if (arr.length === 1) {
    return false;
  }
  return i < arr.length - 1;
}

function isThreadChildAt<T>(arr: Array<T>, i: number) {
  if (arr.length === 1) {
    return false;
  }
  return i > 0;
}
