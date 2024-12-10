import { data } from "react-router";
import type { Route } from "./+types/logout";

export async function action(args: Route.ActionArgs) {
  const session = await args.context.session.get(args.request);
  session.unset("did");
  return data("ok", {
    headers: {
      "Set-Cookie": await args.context.session.commit(session),
    },
  });
}
