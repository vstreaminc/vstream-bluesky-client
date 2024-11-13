import { OAuthResolverError } from "@atproto/oauth-client-node";
import { isValidHandle } from "@atproto/syntax";
import { type ActionFunctionArgs, json, redirect } from "@remix-run/node";
import { useActionData } from "@remix-run/react";
import { Button } from "~/components/ui/button";

export async function action({ request, context }: ActionFunctionArgs) {
  const { handle } = Object.fromEntries(await request.formData());
  if (typeof handle !== "string" || !isValidHandle(handle)) {
    return json({ error: "Handle in invalid" });
  }

  try {
    const url = await context.atProtoClient.authorize(handle);
    return redirect(url.toString());
  } catch (err) {
    console.error(err);
    return json({
      error:
        err instanceof OAuthResolverError
          ? err.message
          : "couldn't initiate login",
    });
  }
}

export default function Login() {
  const actionData = useActionData<typeof action>();

  return (
    <>
      <h1>Login into VStream</h1>
      <form method="post">
        <input
          type="text"
          name="handle"
          placeholder="Enter your handle (eg alice.bsky.social)"
          required
        />
        <Button type="submit">Login</Button>
      </form>
      {actionData?.error ? <div>{actionData.error}</div> : null}
      <div className="signup-cta">
        Don&rsquo;t have an account for VStream?
        <a href="https://bsky.app">Sign up for Bluesky</a> to create one now!
      </div>
    </>
  );
}
