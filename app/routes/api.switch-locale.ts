import { data, type ActionFunctionArgs } from "@remix-run/node";
import { isSupportedLocale } from "~/lib/locale";
import { messagesForLocale } from "~/lib/locale.server";

export async function action(args: ActionFunctionArgs) {
  const [{ locale }, session] = await Promise.all([
    args.request.json(),
    args.context.session.get(args.request),
  ]);
  if (!isSupportedLocale(locale)) {
    throw new Response("Unsupported locale", { status: 401 });
  }
  const messages = messagesForLocale(locale);
  session.set("locale", locale);
  return data(messages, {
    headers: {
      "Set-Cookie": await args.context.session.commit(session),
    },
  });
}
