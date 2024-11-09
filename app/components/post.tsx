import * as React from "react";
import { FormattedMessage } from "react-intl";
import { RefreshCcw } from "lucide-react";
import type { FeedViewVStreamPost, FeedViewVStreamPostSlice } from "~/types";
import { cn } from "~/lib/utils";
import { Avatar, AvatarImage } from "~/components/ui/avatar";
import { RelativeTime } from "~/components/relativeTime";
import { ImageMosaic } from "~/components/imageMosaic";

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

  return (
    <article
      className={cn("px-4 hover:bg-muted", {
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
  return <div className="mt-2">{post.plainText}</div>;
}

function FeedPostEmbed({ post }: { post: FeedViewVStreamPost }) {
  if (!post.embed) return null;

  const images = post.embed.images.map((i) => ({
    ...i,
    id: i.fullsize,
    aspectRatio: (i.aspectRatio?.width ?? 1) / (i.aspectRatio?.height ?? 1),
  }));

  return (
    <div className="mt-2">
      <ImageMosaic
        className="mx-auto max-h-96 sm:max-h-[36rem]"
        items={images}
        render={(image, _idx) => (
          <img key={image.id} src={image.thumb} alt={image.alt} />
        )}
      />
    </div>
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
