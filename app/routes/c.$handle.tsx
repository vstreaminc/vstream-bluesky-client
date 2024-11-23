import {
  type LoaderFunctionArgs,
  redirect,
  type SerializeFrom,
} from "@remix-run/node";
import {
  Await,
  type ClientLoaderFunctionArgs,
  useLoaderData,
} from "@remix-run/react";
import { Suspense } from "react";
import { $path } from "remix-routes";
import { DescriptionAutoLinker } from "~/components/descriptionAutoLinker";
import { MainLayout } from "~/components/mainLayout";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import * as clientDB from "~/db.client";
import { profiledDetailedToSimple } from "~/lib/bsky.server";

export async function loader(args: LoaderFunctionArgs) {
  const { handle } = args.params;
  if (!handle!.startsWith("@") && !handle!.startsWith("did:")) {
    const searchParams = new URLSearchParams(args.request.url.split("?")[1]);
    throw redirect(
      $path(
        "/c/:handle",
        {
          handle: `@${handle}`,
        },
        searchParams,
      ),
    );
  }
  const agent = await args.context.requireLoggedInUser();

  const res = await agent.getProfile({
    actor: handle!.startsWith("@") ? handle!.slice(1) : handle!,
  });
  const profile = profiledDetailedToSimple(res.data);

  return { profile };
}

export function clientLoader(args: ClientLoaderFunctionArgs) {
  const handleOrDid = args.params.handle!;
  const profile = clientDB.loadProfile(handleOrDid);
  if (profile) {
    return {
      profile,
      serverData: args.serverLoader<typeof loader>().then((p) => {
        clientDB.saveProfile(handleOrDid, p.profile);
        return p;
      }),
    };
  }

  return args.serverLoader<typeof loader>().then((p) => {
    clientDB.saveProfile(handleOrDid, p.profile);
    return p;
  });
}

export default function ProfilePageScreen() {
  const data = useLoaderData<typeof loader | typeof clientLoader>();

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

export function ProfilePage({ profile }: SerializeFrom<typeof loader>) {
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
        <div>
          <h1 className="text-3xl text-foreground">{profile.displayName}</h1>
          <div className="max-w-2xl text-sm text-muted-foreground">
            <DescriptionAutoLinker description={profile.description} />
          </div>
        </div>
      </div>
    </div>
  );
}
