import type { AppContext } from "../server/context/appContext";
import type { RequestContext } from "../server/context/requestContext";

declare module "react-router" {
  interface AppLoadContext extends AppContext, RequestContext {}
}

export {};
