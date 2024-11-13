import "@remix-run/node";
import type { AppContext } from "../server/context/appContext";
import type { RequestContext } from "../server/context/requestContext";

declare module "@remix-run/node" {
  export interface AppLoadContext extends AppContext, RequestContext {}
}
