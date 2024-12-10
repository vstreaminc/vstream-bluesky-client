import { Suspense } from "react";
import { HOUR, SECOND } from "@atproto/common";
import { redirect, Await } from "react-router";
import { Bell } from "lucide-react";
import { $path } from "safe-routes";
import { DescriptionAutoLinker } from "~/components/descriptionAutoLinker";
import { FollowButton } from "~/components/followButton";
import { MainLayout } from "~/components/mainLayout";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { loadProfile, saveProfile } from "~/hooks/useLoadedProfile";
import { profiledDetailedToSimple } from "~/lib/bsky.server";
import type { SerializeFrom, VStreamProfileViewSimple } from "~/types";
import { Feed } from "~/components/feed";
import { loadFeed } from "~/hooks/useFeedData";
import { loader as fetchFeedSlices } from "./api.feed.$feed";
import type { Route } from "./+types/c.$handle";

export async function loader(args: Route.LoaderArgs): Promise<{
  profile: VStreamProfileViewSimple;
  feed?: SerializeFrom<typeof fetchFeedSlices> | Promise<SerializeFrom<typeof fetchFeedSlices>>;
}> {
  const handleOrDid = args.params.handle!;
  if (!handleOrDid.startsWith("@") && !handleOrDid.startsWith("did:")) {
    const searchParams = new URLSearchParams(args.request.url.split("?")[1]);
    throw redirect(
      $path(
        "/c/:handle",
        {
          handle: `@${handleOrDid}`,
        },
        searchParams,
      ),
    );
  }
  const [agent, cache] = await Promise.all([
    args.context.requireLoggedInUser(),
    args.context.cache(),
  ]);

  const did = handleOrDid.startsWith("did:")
    ? handleOrDid
    : await cache.getOrSet(
        `did:${handleOrDid}`,
        () => agent.resolveHandle({ handle: handleOrDid.slice(1) }).then((r) => r.data.did),
        {
          expiresIn: 1 * HOUR,
          staleWhileRevalidate: 23 * HOUR,
        },
      );

  const data = await cache.getOrSet(
    `profile:${did}`,
    () =>
      agent
        .getProfile({
          actor: did,
        })
        .then((r) => r.data),
    {
      expiresIn: 15 * SECOND,
    },
  );
  const profile = profiledDetailedToSimple(data);
  const feed = fetchFeedSlices({
    ...args,
    params: { feed: `author|${did}` },
  });

  return { profile, feed };
}

export function clientLoader(args: Route.ClientLoaderArgs) {
  const handleOrDid = args.params.handle!;
  const profile = loadProfile(handleOrDid);
  if (profile) {
    const feed = loadFeed(`author|${profile.did}`)?.value;
    return {
      profile,
      feed,
      serverData: args.serverLoader().then((p) => {
        saveProfile(handleOrDid, p.profile);
        return { clientFeed: feed, ...p };
      }),
    };
  }

  return args.serverLoader().then((p) => {
    saveProfile(handleOrDid, p.profile);
    return p;
  });
}

export default function ProfilePageScreen({ loaderData: data }: Route.ComponentProps) {
  return (
    <MainLayout>
      {"serverData" in data ? (
        <Suspense fallback={<ProfilePage key={data.profile.did} {...data} />}>
          <Await resolve={data.serverData}>
            {(data) => <ProfilePage key={data.profile.did} {...data} />}
          </Await>
        </Suspense>
      ) : (
        <ProfilePage key={data.profile.did} {...data} />
      )}
    </MainLayout>
  );
}

export function ProfilePage({
  profile,
  ...props
}: SerializeFrom<typeof loader> & {
  clientFeed?: NonNullable<NonNullable<ReturnType<typeof loadFeed>>["value"]>;
}) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4">
      <div className="mb-6 bg-gray-50" style={{ aspectRatio: "3 / 1" }}>
        <img src={profile.banner} alt="" className="object-cover" />
      </div>
      <div className="flex items-center">
        <Avatar className="mr-6 size-28">
          <AvatarImage src={profile.avatar} />
          <AvatarFallback>@</AvatarFallback>
        </Avatar>
        <div className="max-w-2xl">
          <h1 className="text-3xl text-foreground">{profile.displayName}</h1>
          <div className="text-sm text-muted-foreground">
            <DescriptionAutoLinker description={profile.description} />
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <FollowButton profile={profile} size="lg" />
          <Button size="icon">
            <Bell />
          </Button>
        </div>
      </div>

      <div className="mt-4">
        {props.feed !== undefined ? (
          isPromise(props.feed) ? (
            <Suspense
              fallback={
                "clientFeed" in props && props.clientFeed ? (
                  <Feed
                    name={`author|${profile.did}`}
                    initialSlices={props.clientFeed.slices}
                    initialCursor={props.clientFeed.cursor}
                    showTopBorder
                  />
                ) : undefined
              }
            >
              <Await resolve={props.feed}>
                {({ slices, cursor }) => (
                  <Feed
                    name={`author|${profile.did}`}
                    initialSlices={slices}
                    initialCursor={cursor}
                    showTopBorder
                  />
                )}
              </Await>
            </Suspense>
          ) : (
            <Feed
              name={`author|${profile.did}`}
              initialSlices={props.feed.slices}
              initialCursor={props.feed.cursor}
              showTopBorder
            />
          )
        ) : null}
      </div>
    </div>
  );
}

function isPromise<T>(x: unknown): x is Promise<T> {
  return typeof x === "object" && !!x && "then" in x && typeof x.then === "function";
}
