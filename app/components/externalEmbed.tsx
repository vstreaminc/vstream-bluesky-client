import { Globe } from "lucide-react";
import type { VStreamEmbedExternal } from "~/types";
import { cn } from "~/lib/utils";
import { UnstyledLink } from "./ui/link";

export function FeedPostExternalEmbed({
  embed,
}: {
  embed: VStreamEmbedExternal;
}) {
  const url = new URL(embed.uri);

  return (
    <UnstyledLink
      className="mt-2 block rounded-t-sm border border-muted"
      href={embed.uri}
    >
      {embed.thumb && (
        <img
          className="w-full border-b border-muted object-center"
          src={embed.thumb}
          alt={embed.title}
        />
      )}
      <div className="px-2">
        <div className="border-b border-muted py-2">
          <div className="font-semibold">{embed.title}</div>
          <div
            className={cn(
              { "line-clamp-2": !!embed.thumb, "line-clamp-5": !embed.thumb },
              "text-sm",
            )}
            style={{
              whiteSpaceCollapse: "preserve",
            }}
          >
            {embed.description}
          </div>
        </div>
        <div className="flex items-center gap-1 py-2 text-xs text-muted-foreground">
          <Globe className="size-3" />
          <span>{url.hostname}</span>
        </div>
      </div>
    </UnstyledLink>
  );
}
