import { index, prefix, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("./routes/home.tsx"),
  route("explore", "./routes/explore.tsx"),
  route("c/:handle", "./routes/profile-page.tsx"),
  route("c/:handle/p/:rkey", "./routes/post-page.tsx"),

  // Auth routes
  route("login", "./routes/login.tsx"),
  ...prefix("auth", [
    route("logout", "./routes/logout.ts"),
    route("bsky/callback", "./routes/bsky-callback.tsx"),
  ]),

  // API Routes
  ...prefix("api", [
    route("feed/:feed", "./routes/api/list-feed.ts"),
    route("profile/:handleOrDid", "./routes/api/load-profile.ts"),
    route("switch-locale", "./routes/api/switch-locale.ts"),
  ]),
] satisfies RouteConfig;
