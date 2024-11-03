import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useRouteLoaderData,
} from "@remix-run/react";
import { LinksFunction, LoaderFunctionArgs, data } from "@remix-run/node";

import "./tailwind.css";
import { DEFAULT_LOCALE } from "./lib/locale";
import { I18nProvider } from "react-aria-components";

export const links: LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const headers = new Headers();
  const [agent, currentLocale, session] = await Promise.all([
    context.maybeLoggedInUser(),
    context.currentLocale(),
    context.session.get(request),
  ]);

  if (session.get("locale") !== currentLocale) {
    session.set("locale", currentLocale);
    headers.set("Set-Cookie", await context.session.commit(session));
  }

  return data(
    {
      locale: currentLocale,
      viewer: agent ? await context.bsky.currentProfile(agent) : null,
    },
    { headers },
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useRouteLoaderData<typeof loader>("root");

  return (
    <html lang={data?.locale ?? DEFAULT_LOCALE}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const { locale } = useLoaderData<typeof loader>();

  return (
    <I18nProvider locale={locale}>
      <Outlet />
    </I18nProvider>
  );
}
