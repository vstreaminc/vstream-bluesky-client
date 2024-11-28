import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useNavigate,
  useRouteLoaderData,
} from "@remix-run/react";
import type { NavigateOptions } from "react-router-dom";
import {
  type LinksFunction,
  type LoaderFunctionArgs,
  data,
} from "@remix-run/node";
import { I18nProvider, RouterProvider } from "react-aria-components";
import { DEFAULT_LOCALE } from "./lib/locale";
import { useBetterHref } from "./hooks/useBetterHref";
import "./tailwind.css";

declare module "react-aria-components" {
  interface RouterConfig {
    routerOptions: NavigateOptions;
  }
}

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
  {
    rel: "icon",
    href: "/favicon_32.png",
    type: "image/png",
    sizes: "32x32",
  },
  {
    rel: "icon",
    href: "/favicon_128.png",
    type: "image/png",
    sizes: "128x128",
  },
  {
    rel: "apple-touch-icon",
    href: "/favicon_180.png",
    type: "image/png",
    sizes: "180x180",
  },
  {
    rel: "shortcut icon",
    href: "/favicon_192.png",
    type: "image/png",
    sizes: "192x192",
  },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
  const headers = new Headers();
  const [agent, currentLocale, session] = await Promise.all([
    context.maybeLoggedInUser(),
    context.intl.locale(),
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
    <html lang={data?.locale ?? DEFAULT_LOCALE} suppressHydrationWarning={true}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        {/* Best to add inline in `head` to avoid FOUC */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
document.documentElement.classList.toggle(
  'dark',
  localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)
)`.trim(),
          }}
        ></script>
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
  const navigate = useNavigate();

  return (
    <I18nProvider locale={locale}>
      <RouterProvider navigate={navigate} useHref={useBetterHref}>
        <Outlet />
      </RouterProvider>
    </I18nProvider>
  );
}
