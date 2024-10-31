import "@remix-run/node";
import { AppContext } from "../server/context";

declare module "@remix-run/node" {
  export interface AppLoadContext extends AppContext {}
}
