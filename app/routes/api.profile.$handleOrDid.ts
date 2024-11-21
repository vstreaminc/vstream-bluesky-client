import type { LoaderFunctionArgs } from "@remix-run/node";
import type { ClientLoaderFunctionArgs } from "@remix-run/react";
import * as db from "~/db.client";
import { profiledDetailedToSimple } from "~/lib/bsky.server";

export async function loader(args: LoaderFunctionArgs) {
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

export async function clientLoader(args: ClientLoaderFunctionArgs) {
  let profile = db.loadProfile(args.params.handleOrDid!);
  if (profile) return profile;
  profile = await args.serverLoader<typeof loader>();
  db.saveProfile(args.params.handleOrDid!, profile);
  return profile;
}
