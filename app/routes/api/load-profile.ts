import { loadProfile, saveProfile } from "~/hooks/useLoadedProfile";
import { profiledDetailedToSimple } from "~/lib/bsky.server";
import type { Route } from "./+types/load-profile";

export async function loader(args: Route.LoaderArgs) {
  const handleOrDid = args.params.handleOrDid!;
  const agent = await args.context.requireLoggedInUser();

  const res = await agent.getProfile({
    actor: handleOrDid.startsWith("@") ? handleOrDid.slice(1) : handleOrDid,
  });

  if (!res.success) {
    throw new Response("Not found", { status: 404 });
  }

  return profiledDetailedToSimple(res.data);
}

export async function clientLoader(args: Route.ClientLoaderArgs) {
  let profile = loadProfile(args.params.handleOrDid!);
  if (profile) return profile;
  profile = await args.serverLoader();
  saveProfile(args.params.handleOrDid!, profile);
  return profile;
}
