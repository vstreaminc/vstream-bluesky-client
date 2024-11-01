import {
  json,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

export const meta: MetaFunction = () => {
  return [
    { title: "VStream" },
    { name: "description", content: "~~~Under Construction~~~" },
    // TODO: Remove before going live
    { name: "robots", content: "noindex" },
  ];
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const agent = await context.maybeLoggedInUser(request);

  if (agent) {
    const { data: profile } = await agent.app.bsky.actor.getProfile(
      { actor: agent.assertDid },
      { signal: request.signal },
    );
    return json({ profile });
  }

  return json({ profile: null });
}

export default function Index() {
  const { profile } = useLoaderData<typeof loader>();

  return (
    <>
      <h1>VStream</h1>
      {profile ? <pre>{JSON.stringify(profile, null, 2)}</pre> : null}
    </>
  );
}
