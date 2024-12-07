import { Globe } from "lucide-react";
import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { VStreamEmbedExternal } from "~/types";
import { cn } from "~/lib/utils";
import { useShouldAutoplaySingleton } from "~/hooks/useAutoplaySingleton";
import { useHydrated } from "~/hooks/useHydrated";
import { useExternalScript } from "~/hooks/useExernalScript";
import { UnstyledLink } from "./ui/link";
import { EventStopper } from "./ui/eventStopper";

const embedPlayerSources = [
  "youtube",
  "youtubeShorts",
  "twitch",
  "spotify",
  "soundcloud",
  "appleMusic",
  "vimeo",
  "giphy",
  "tenor",
  "flickr",
] as const;

type EmbedPlayerSource = (typeof embedPlayerSources)[number];

type EmbedPlayerType =
  | "youtube_video"
  | "youtube_short"
  | "twitch_video"
  | "spotify_album"
  | "spotify_playlist"
  | "spotify_song"
  | "soundcloud_track"
  | "soundcloud_set"
  | "apple_music_playlist"
  | "apple_music_album"
  | "apple_music_song"
  | "vimeo_video"
  | "giphy_gif"
  | "tenor_gif"
  | "flickr_album";

export const externalEmbedLabels: Record<EmbedPlayerSource, string> = {
  youtube: "YouTube",
  youtubeShorts: "YouTube Shorts",
  vimeo: "Vimeo",
  twitch: "Twitch",
  giphy: "GIPHY",
  tenor: "Tenor",
  spotify: "Spotify",
  appleMusic: "Apple Music",
  soundcloud: "SoundCloud",
  flickr: "Flickr",
};

interface EmbedPlayerParams {
  type: EmbedPlayerType;
  playerUri: string;
  isGif?: boolean;
  source: EmbedPlayerSource;
  metaUri?: string;
  hideDetails?: boolean;
  dimensions?: {
    height: number;
    width: number;
  };
}

const giphyRegex = /media(?:[0-4]\.giphy\.com|\.giphy\.com)/i;
const gifFilenameRegex = /^(\S+)\.(webp|gif|mp4)$/i;

function parseEmbedPlayerFromUrl(url: string): EmbedPlayerParams | undefined {
  let urlp;
  try {
    urlp = new URL(url);
  } catch (e) {
    return undefined;
  }

  // youtube
  if (urlp.hostname === "youtu.be") {
    const origin = typeof window !== "undefined" ? window.location.hostname : "";
    const videoId = urlp.pathname.split("/")[1];
    const t = urlp.searchParams.get("t") ?? "0";
    const seek = encodeURIComponent(t.replace(/s$/, ""));

    if (videoId) {
      return {
        type: "youtube_video",
        source: "youtube",
        playerUri: `https://www.youtube.com/embed/${videoId}?start=${seek}&origin=${origin}`,
      };
    }
  }
  if (
    urlp.hostname === "www.youtube.com" ||
    urlp.hostname === "youtube.com" ||
    urlp.hostname === "m.youtube.com" ||
    urlp.hostname === "music.youtube.com"
  ) {
    const origin = typeof window !== "undefined" ? window.location.hostname : "";
    const [, page, shortOrLiveVideoId] = urlp.pathname.split("/");

    const isShorts = page === "shorts";
    const isLive = page === "live";
    const videoId =
      isShorts || isLive ? shortOrLiveVideoId : (urlp.searchParams.get("v") as string);
    const t = urlp.searchParams.get("t") ?? "0";
    const seek = encodeURIComponent(t.replace(/s$/, ""));

    if (videoId) {
      return {
        type: isShorts ? "youtube_short" : "youtube_video",
        source: isShorts ? "youtubeShorts" : "youtube",
        hideDetails: isShorts ? true : undefined,
        playerUri: `https://www.youtube.com/embed/${videoId}?start=${seek}&origin=${origin}`,
      };
    }
  }

  // twitch
  if (
    urlp.hostname === "twitch.tv" ||
    urlp.hostname === "www.twitch.tv" ||
    urlp.hostname === "m.twitch.tv"
  ) {
    const parent = typeof window !== "undefined" ? window.location.hostname : "";

    const [, channelOrVideo, clipOrId, id] = urlp.pathname.split("/");

    if (channelOrVideo === "videos") {
      return {
        type: "twitch_video",
        source: "twitch",
        playerUri: `https://player.twitch.tv/?muted&autoplay&video=${clipOrId}&parent=${parent}`,
      };
    } else if (clipOrId === "clip") {
      return {
        type: "twitch_video",
        source: "twitch",
        playerUri: `https://clips.twitch.tv/embed?muted&autoplay&clip=${id}&parent=${parent}`,
      };
    } else if (channelOrVideo) {
      return {
        type: "twitch_video",
        source: "twitch",
        playerUri: `https://player.twitch.tv/?muted&autoplay&channel=${channelOrVideo}&parent=${parent}`,
      };
    }
  }

  // spotify
  if (urlp.hostname === "open.spotify.com") {
    const [, typeOrLocale, idOrType, id] = urlp.pathname.split("/");

    if (idOrType) {
      if (typeOrLocale === "playlist" || idOrType === "playlist") {
        return {
          type: "spotify_playlist",
          source: "spotify",
          playerUri: `https://open.spotify.com/embed/playlist/${id ?? idOrType}`,
        };
      }
      if (typeOrLocale === "album" || idOrType === "album") {
        return {
          type: "spotify_album",
          source: "spotify",
          playerUri: `https://open.spotify.com/embed/album/${id ?? idOrType}`,
        };
      }
      if (typeOrLocale === "track" || idOrType === "track") {
        return {
          type: "spotify_song",
          source: "spotify",
          playerUri: `https://open.spotify.com/embed/track/${id ?? idOrType}`,
        };
      }
      if (typeOrLocale === "episode" || idOrType === "episode") {
        return {
          type: "spotify_song",
          source: "spotify",
          playerUri: `https://open.spotify.com/embed/episode/${id ?? idOrType}`,
        };
      }
      if (typeOrLocale === "show" || idOrType === "show") {
        return {
          type: "spotify_song",
          source: "spotify",
          playerUri: `https://open.spotify.com/embed/show/${id ?? idOrType}`,
        };
      }
    }
  }

  // soundcloud
  if (urlp.hostname === "soundcloud.com" || urlp.hostname === "www.soundcloud.com") {
    const [, user, trackOrSets, set] = urlp.pathname.split("/");

    if (user && trackOrSets) {
      if (trackOrSets === "sets" && set) {
        return {
          type: "soundcloud_set",
          source: "soundcloud",
          playerUri: `https://w.soundcloud.com/player/?url=${url}&auto_play=true&visual=false&hide_related=true`,
        };
      }

      return {
        type: "soundcloud_track",
        source: "soundcloud",
        playerUri: `https://w.soundcloud.com/player/?url=${url}&auto_play=true&visual=false&hide_related=true`,
      };
    }
  }

  if (urlp.hostname === "music.apple.com" || urlp.hostname === "music.apple.com") {
    // This should always have: locale, type (playlist or album), name, and id. We won't use spread since we want
    // to check if the length is correct
    const pathParams = urlp.pathname.split("/");
    const type = pathParams[2];
    const songId = urlp.searchParams.get("i");

    if (pathParams.length === 5 && (type === "playlist" || type === "album")) {
      // We want to append the songId to the end of the url if it exists
      const embedUri = `https://embed.music.apple.com${urlp.pathname}${
        urlp.search ? "?i=" + songId : ""
      }`;

      if (type === "playlist") {
        return {
          type: "apple_music_playlist",
          source: "appleMusic",
          playerUri: embedUri,
        };
      } else if (type === "album") {
        if (songId) {
          return {
            type: "apple_music_song",
            source: "appleMusic",
            playerUri: embedUri,
          };
        } else {
          return {
            type: "apple_music_album",
            source: "appleMusic",
            playerUri: embedUri,
          };
        }
      }
    }
  }

  if (urlp.hostname === "vimeo.com" || urlp.hostname === "www.vimeo.com") {
    const [, videoId] = urlp.pathname.split("/");
    if (videoId) {
      return {
        type: "vimeo_video",
        source: "vimeo",
        playerUri: `https://player.vimeo.com/video/${videoId}?autoplay=1`,
      };
    }
  }

  if (urlp.hostname === "giphy.com" || urlp.hostname === "www.giphy.com") {
    const [, gifs, nameAndId] = urlp.pathname.split("/");

    /*
     * nameAndId is a string that consists of the name (dash separated) and the id of the gif (the last part of the name)
     * We want to get the id of the gif, then direct to media.giphy.com/media/{id}/giphy.webp so we can
     * use it in an <Image> component
     */

    if (gifs === "gifs" && nameAndId) {
      const gifId = nameAndId.split("-").pop();

      if (gifId) {
        return {
          type: "giphy_gif",
          source: "giphy",
          isGif: true,
          hideDetails: true,
          metaUri: `https://giphy.com/gifs/${gifId}`,
          playerUri: `https://i.giphy.com/media/${gifId}/200.webp`,
        };
      }
    }
  }

  // There are five possible hostnames that also can be giphy urls: media.giphy.com and media0-4.giphy.com
  // These can include (presumably) a tracking id in the path name, so we have to check for that as well
  if (giphyRegex.test(urlp.hostname)) {
    // We can link directly to the gif, if its a proper link
    const [, media, trackingOrId, idOrFilename, filename] = urlp.pathname.split("/");

    if (media === "media") {
      if (idOrFilename && gifFilenameRegex.test(idOrFilename)) {
        return {
          type: "giphy_gif",
          source: "giphy",
          isGif: true,
          hideDetails: true,
          metaUri: `https://giphy.com/gifs/${trackingOrId}`,
          playerUri: `https://i.giphy.com/media/${trackingOrId}/200.webp`,
        };
      } else if (filename && gifFilenameRegex.test(filename)) {
        return {
          type: "giphy_gif",
          source: "giphy",
          isGif: true,
          hideDetails: true,
          metaUri: `https://giphy.com/gifs/${idOrFilename}`,
          playerUri: `https://i.giphy.com/media/${idOrFilename}/200.webp`,
        };
      }
    }
  }

  // Finally, we should see if it is a link to i.giphy.com. These links don't necessarily end in .gif but can also
  // be .webp
  if (urlp.hostname === "i.giphy.com" || urlp.hostname === "www.i.giphy.com") {
    const [, mediaOrFilename, filename] = urlp.pathname.split("/");

    if (mediaOrFilename === "media" && filename) {
      const gifId = filename.split(".")[0];
      return {
        type: "giphy_gif",
        source: "giphy",
        isGif: true,
        hideDetails: true,
        metaUri: `https://giphy.com/gifs/${gifId}`,
        playerUri: `https://i.giphy.com/media/${gifId}/200.webp`,
      };
    } else if (mediaOrFilename) {
      const gifId = mediaOrFilename.split(".")[0];
      return {
        type: "giphy_gif",
        source: "giphy",
        isGif: true,
        hideDetails: true,
        metaUri: `https://giphy.com/gifs/${gifId}`,
        playerUri: `https://i.giphy.com/media/${mediaOrFilename.split(".")[0]}/200.webp`,
      };
    }
  }

  const tenorGif = parseTenorGif(urlp);
  if (tenorGif.success) {
    const { playerUri, dimensions } = tenorGif;

    return {
      type: "tenor_gif",
      source: "tenor",
      isGif: true,
      hideDetails: true,
      playerUri,
      dimensions,
    };
  }

  // this is a standard flickr path! we can use the embedder for albums and groups, so validate the path
  if (urlp.hostname === "www.flickr.com" || urlp.hostname === "flickr.com") {
    let i = urlp.pathname.length - 1;
    while (i > 0 && urlp.pathname.charAt(i) === "/") {
      --i;
    }

    const path_components = urlp.pathname.slice(1, i + 1).split("/");
    if (path_components.length === 4) {
      // discard username - it's not relevant
      const [photos, , albums, id] = path_components;
      if (photos === "photos" && albums === "albums") {
        // this at least has the shape of a valid photo-album URL!
        return {
          type: "flickr_album",
          source: "flickr",
          playerUri: `https://embedr.flickr.com/photosets/${id}`,
        };
      }
    }

    if (path_components.length === 3) {
      const [groups, id, pool] = path_components;
      if (groups === "groups" && pool === "pool") {
        return {
          type: "flickr_album",
          source: "flickr",
          playerUri: `https://embedr.flickr.com/groups/${id}`,
        };
      }
    }
    // not an album or a group pool, don't know what to do with this!
    return undefined;
  }

  // link shortened flickr path
  if (urlp.hostname === "flic.kr") {
    const b58alph = "123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
    const [, type, idBase58Enc] = urlp.pathname.split("/");
    let id = 0n;
    for (const char of idBase58Enc) {
      const nextIdx = b58alph.indexOf(char);
      if (nextIdx >= 0) {
        id = id * 58n + BigInt(nextIdx);
      } else {
        // not b58 encoded, ergo not a valid link to embed
        return undefined;
      }
    }

    switch (type) {
      case "go": {
        const formattedGroupId = `${id}`;
        return {
          type: "flickr_album",
          source: "flickr",
          playerUri: `https://embedr.flickr.com/groups/${formattedGroupId.slice(
            0,
            -2,
          )}@N${formattedGroupId.slice(-2)}`,
        };
      }
      case "s":
        return {
          type: "flickr_album",
          source: "flickr",
          playerUri: `https://embedr.flickr.com/photosets/${id}`,
        };
      default:
        // we don't know what this is so we can't embed it
        return undefined;
    }
  }
}

function getPlayerAspect({
  type,
  hasThumb,
  width,
}: {
  type: EmbedPlayerParams["type"];
  hasThumb: boolean;
  width: number;
}): { aspectRatio?: number | string; height?: number } {
  if (!hasThumb) return { aspectRatio: 16 / 9 };

  switch (type) {
    case "youtube_video":
    case "twitch_video":
    case "vimeo_video":
      return { aspectRatio: 16 / 9 };
    case "youtube_short":
      return { aspectRatio: "var(--youtube-short-ar)" };
    case "spotify_album":
    case "apple_music_album":
    case "apple_music_playlist":
    case "spotify_playlist":
    case "soundcloud_set":
      return { height: 380 };
    case "spotify_song":
      if (width <= 300) {
        return { height: 155 };
      }
      return { height: 232 };
    case "soundcloud_track":
      return { height: 165 };
    case "apple_music_song":
      return { height: 150 };
    default:
      return { aspectRatio: 16 / 9 };
  }
}

function parseTenorGif(urlp: URL):
  | { success: false }
  | {
      success: true;
      playerUri: string;
      dimensions: { height: number; width: number };
    } {
  if (urlp.hostname !== "media.tenor.com") {
    return { success: false };
  }

  let [, id, filename] = urlp.pathname.split("/");

  if (!id || !filename) {
    return { success: false };
  }

  if (!id.includes("AAAAC")) {
    return { success: false };
  }

  const h = urlp.searchParams.get("hh");
  const w = urlp.searchParams.get("ww");

  if (!h || !w) {
    return { success: false };
  }

  const dimensions = {
    height: Number(h),
    width: Number(w),
  };

  if (
    // isSafari
    typeof window !== "undefined" &&
    /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
  ) {
    id = id.replace("AAAAC", "AAAP1");
    filename = filename.replace(".gif", ".mp4");
  } else {
    id = id.replace("AAAAC", "AAAP3");
    filename = filename.replace(".gif", ".webm");
  }

  return {
    success: true,
    playerUri: `https://t.gifs.bsky.app/${id}/${filename}`,
    dimensions,
  };
}

// See: https://github.com/bluesky-social/social-app/blob/5f4a0f2881b9420f3a3f3fb6527352f58a99d9ea/src/lib/gif-alt-text.ts#L2-L3
const USER_ALT_PREFIX = "Alt: ";
const DEFAULT_ALT_PREFIX = "ALT: ";

function parseAltFromGIFDescription(description: string): {
  isPreferred: boolean;
  alt: string;
} {
  if (description.startsWith(USER_ALT_PREFIX)) {
    return {
      isPreferred: true,
      alt: description.replace(USER_ALT_PREFIX, ""),
    };
  } else if (description.startsWith(DEFAULT_ALT_PREFIX)) {
    return {
      isPreferred: false,
      alt: description.replace(DEFAULT_ALT_PREFIX, ""),
    };
  }
  return {
    isPreferred: false,
    alt: description,
  };
}

const GifView = memo(function GifView({
  autoplay,
  source,
  accessibilityLabel,
  className,
}: {
  autoplay: boolean;
  source: string;
  accessibilityLabel?: string;
  className?: string;
}) {
  const videoPlayerRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (autoplay) {
      videoPlayerRef.current?.play();
    } else {
      videoPlayerRef.current?.pause();
    }
  }, [autoplay]);

  return (
    <video
      className={cn("w-full", className)}
      src={source}
      autoPlay={autoplay ? true : undefined}
      preload={autoplay ? "auto" : undefined}
      playsInline
      loop
      muted
      ref={videoPlayerRef}
      aria-label={accessibilityLabel}
    />
  );
});
GifView.displayName = "GifView";

function GifEmbed({
  params,
  altText,
  isPreferredAltText,
}: {
  params: EmbedPlayerParams;
  altText: string;
  isPreferredAltText: boolean;
  hideAlt?: boolean;
}) {
  return (
    <div
      className="w-full"
      style={{
        aspectRatio: params.dimensions!.width / params.dimensions!.height,
      }}
    >
      <GifView source={params.playerUri} autoplay={true} accessibilityLabel={altText} />
      {isPreferredAltText && <div>{altText}</div>}
    </div>
  );
}

function ExternalGifEmbed({
  embed,
  params,
}: {
  embed: VStreamEmbedExternal;
  params: EmbedPlayerParams;
}) {
  // Tracking whether the gif has been loaded yet
  const [isPrefetched, setIsPrefetched] = useState(false);

  useEffect(() => {
    setIsPrefetched(false);
    const img = new Image();
    img.onload = () => {
      setIsPrefetched(true);
    };
    img.src = params.playerUri;
  }, [params.playerUri]);

  return (
    <img className="w-full" src={isPrefetched ? params.playerUri : embed.thumb} alt={embed.title} />
  );
}

function ExternalPlayer({
  embed,
  params,
}: {
  embed: VStreamEmbedExternal;
  params: EmbedPlayerParams;
}) {
  const aspect = useMemo(() => {
    return getPlayerAspect({
      type: params.type,
      width: window.innerWidth,
      hasThumb: !!embed.thumb,
    });
  }, [params.type, embed.thumb]);
  const [isLoading, setIsLoading] = useState(true);
  const onLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  // When a player is in view, we want to replace the thumbnail with the external player.
  const { ref, inView } = useShouldAutoplaySingleton(false);

  return (
    <div className="relative">
      <div
        ref={ref}
        className="bordered-muted flex w-full flex-col overflow-hidden border-b"
        style={aspect}
      >
        {embed.thumb && (!inView || isLoading) ? (
          <>
            <img className="h-full w-full object-cover" src={embed.thumb} alt={embed.title} />
            <div className="absolute inset-0 bg-muted/30" />
          </>
        ) : (
          <div className="absolute inset-0 bg-muted/30" />
        )}
        {params.type === "twitch_video" ? (
          <TwitchPlayer isActive={inView} onLoad={onLoad} params={params} />
        ) : (
          <GenericPlayer isActive={inView} onLoad={onLoad} params={params} />
        )}
      </div>
    </div>
  );
}

function TwitchPlayer({
  isActive,
  onLoad,
  params,
}: {
  isActive: boolean;
  params: EmbedPlayerParams;
  onLoad: () => void;
}) {
  const id = useId();
  const [isOnline, setIsOnline] = useState(false);
  const isTwitchLoaded = useExternalScript("https://player.twitch.tv/js/embed/v1.js");

  const { channel, video, parent } = useMemo(() => {
    const urlParams = new URLSearchParams(params.playerUri.split("?")[1]);
    const channel = urlParams.get("channel") ?? undefined;
    const video = urlParams.get("video") ?? urlParams.get("clip") ?? undefined;
    const parent = urlParams.get("parent")!;
    return { channel, video, parent };
  }, [params.playerUri]);

  useEffect(() => {
    if (!isTwitchLoaded || !isActive) return;
    const player = new Twitch.Player(id, {
      channel,
      video,
      parent: [parent],
      width: "100%",
      height: "100%",
      muted: true,
    });

    player.addEventListener(Twitch.Player.ONLINE, () => {
      onLoad();
      setIsOnline(true);
    });

    player.addEventListener(Twitch.Player.OFFLINE, () => {
      setIsOnline(false);
    });
  }, [id, isActive, onLoad, channel, video, parent, isTwitchLoaded]);

  if (!isActive) return null;

  return (
    <>
      <EventStopper
        id={id}
        className={cn({ hidden: !isOnline }, "absolute inset-y-0 -left-20 right-20 z-30")}
      />
      {isActive && isOnline && channel ? (
        <iframe
          title={`${channel ?? "twitch"} chat`}
          src={`https://www.twitch.tv/embed/${channel}/chat?parent=${parent}`}
          height="100%"
          width="100%"
          className="absolute -right-[13.5rem] -top-20 z-30 w-72"
          style={{ height: "calc(100% + 160px)" }}
        />
      ) : null}
    </>
  );
}

function GenericPlayer({
  isActive,
  onLoad,
  params,
}: {
  isActive: boolean;
  params: EmbedPlayerParams;
  onLoad: () => void;
}) {
  if (!isActive) return null;

  return (
    <EventStopper className="absolute inset-0 z-30">
      <iframe
        title={params.type}
        src={params.playerUri}
        allowFullScreen
        onLoad={onLoad}
        className="h-full w-full overflow-hidden"
      />
    </EventStopper>
  );
}

export function FeedPostExternalEmbed({ embed }: { embed: VStreamEmbedExternal }) {
  const hydrated = useHydrated();
  const niceURL = useMemo(() => {
    try {
      const url = new URL(embed.uri);
      return url.host;
    } catch {
      return embed.uri;
    }
  }, [embed.uri]);
  const embedPlayerParams = useMemo(() => {
    return parseEmbedPlayerFromUrl(embed.uri);
  }, [embed.uri]);

  // Allows us to rely on browers APIs in these components
  if (!hydrated) return false;

  if (embedPlayerParams?.source === "tenor") {
    const parsedAlt = parseAltFromGIFDescription(embed.description);
    return (
      <GifEmbed
        params={embedPlayerParams}
        altText={parsedAlt.alt}
        isPreferredAltText={parsedAlt.isPreferred}
      />
    );
  }

  return (
    <UnstyledLink className="mt-2 block rounded-t-sm border border-muted" href={embed.uri}>
      {embed.thumb && !embedPlayerParams ? (
        <img
          className="w-full border-b border-muted object-center"
          src={embed.thumb}
          alt={embed.title}
        />
      ) : embedPlayerParams?.isGif ? (
        <ExternalGifEmbed embed={embed} params={embedPlayerParams} />
      ) : embedPlayerParams ? (
        <ExternalPlayer embed={embed} params={embedPlayerParams} />
      ) : null}
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
          <span>{niceURL}</span>
        </div>
      </div>
    </UnstyledLink>
  );
}
