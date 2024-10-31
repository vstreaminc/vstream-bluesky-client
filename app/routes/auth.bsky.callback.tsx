import assert from "node:assert";
import { LoaderFunctionArgs, redirect } from "@remix-run/node";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const params = new URLSearchParams(request.url.split("?")[1]);
  try {
    const { session } = await context.atProtoClient.callback(params);
    const clientSession = await context.session.get(request);
    assert(!clientSession.has("did"), "session already exists");
    clientSession.set("did", session.did);
    return redirect("/", {
      headers: {
        "Set-Cookie": await context.session.commit(clientSession),
      },
    });
  } catch (err) {
    // oauth callback failed
    console.error(err);
    return redirect("/?error");
  }
}
