import { data } from "react-router";
import { isSupportedLocale } from "~/lib/locale";
import { messagesForLocale } from "~/lib/locale.server";
import type { Route } from "./+types/api.switch-locale";

export async function action(args: Route.ActionArgs) {
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
