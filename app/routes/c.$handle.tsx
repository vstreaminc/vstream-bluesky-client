import {
  type LoaderFunctionArgs,
  redirect,
  type SerializeFrom,
} from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { $path } from "remix-routes";
import { MainLayout } from "~/components/mainLayout";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";

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
  const profile = res.data;

  return { profile };
}

export default function ProfilePageScreen() {
  const data = useLoaderData<typeof loader>();

  return (
    <MainLayout>
      <ProfilePage {...data} />
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
            {profile.description}
          </div>
        </div>
      </div>
    </div>
  );
}
