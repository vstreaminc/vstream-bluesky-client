import { data, type ActionFunctionArgs } from "@remix-run/node";

export async function action(args: ActionFunctionArgs) {
  const session = await args.context.session.get(args.request);
  session.unset("did");
  return data("ok", {
    headers: {
      "Set-Cookie": await args.context.session.commit(session),
    },
  });
}
