import * as React from "react";
import type { FeedViewVStreamPost, FeedViewVStreamPostSlice } from "~/types";
import { Avatar, AvatarImage } from "~/components/ui/avatar";
import { cn } from "~/lib/utils";
import { RefreshCcw } from "lucide-react";
import { RelativeTime } from "./relativeTime";
import { FormattedMessage } from "react-intl";

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
      className={cn("flex gap-4 px-4 pt-5", {
        "pb-5":
          props.isThreadLastChild ||
          (!props.isThreadChild && !props.isThreadParent),
        "border-t border-t-muted-foreground":
          !props.hideTopBorder && !props.isThreadChild,
      })}
    >
      <div className="flex flex-col">
        <Avatar className="size-[3.25rem]">
          <AvatarImage src={post.author.avatar} alt={post.author.displayName} />
        </Avatar>
        {/* Line connecting related posts */}
        {props.isThreadParent && (
          <div className="mx-auto mt-1 w-0.5 grow bg-muted-foreground" />
        )}
      </div>
      <div className="flex grow flex-col gap-2">
        <FeedPostHeader post={post} reason={props.reason} />
        <FeedPostContent post={post} />
      </div>
    </article>
  );
}

function FeedPostHeader({
  post,
  reason,
}: {
  post: FeedViewVStreamPost;
  reason: FeedViewVStreamPostSlice["reason"];
}) {
  return (
    <div>
      {reason && reason.$type === "com.vstream.feed.defs#reasonRepost" ? (
        <div className="flex items-center gap-2 text-sm">
          <RefreshCcw size={20} />
          <span>
            <FormattedMessage
              defaultMessage="Reposted by {name}"
              description="Header of a post letting someone know who it was reposted by"
              values={{ name: post.author.displayName }}
            />
          </span>
        </div>
      ) : null}
      <div className="flex min-w-0 items-center gap-2">
        <span>{post.author.displayName}</span>
        <span className="truncate text-sm">@{post.author.handle}</span>
      </div>
      <div>
        <RelativeTime value={post.createdAt} />
      </div>
    </div>
  );
}

function FeedPostContent({ post }: { post: FeedViewVStreamPost }) {
  return <div>{post.plainText}</div>;
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
