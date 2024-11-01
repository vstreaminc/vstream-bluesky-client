import "@remix-run/node";
import { AppContext } from "../server/context/appContext";
import { RequestContext } from "../server/context/requestContext";

declare module "@remix-run/node" {
  export interface AppLoadContext extends AppContext, RequestContext {}
}
