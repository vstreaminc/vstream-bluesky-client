import { index, prefix, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("./routes/_index.tsx"),
  route("explore", "./routes/explore.tsx"),
  route("c/:handle", "./routes/c.$handle.tsx"),
  route("c/:handle/p/:rkey", "./routes/c.$handle_.p.$rkey.tsx"),

  // Auth routes
  route("login", "./routes/login._index.tsx"),
  ...prefix("auth", [
    route("logout", "./routes/auth.logout.ts"),
    route("bsky/callback", "./routes/auth.bsky.callback.tsx"),
  ]),

  // API Routes
  ...prefix("api", [
    route("feed/:feed", "./routes/api.feed.$feed.ts"),
    route("profile/:handleOrDid", "./routes/api.profile.$handleOrDid.ts"),
    route("switch-locale", "./routes/api.switch-locale.ts"),
  ]),
] satisfies RouteConfig;
