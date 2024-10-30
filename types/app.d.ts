import "@remix-run/node";
import { AppContext } from "../server/config/context";

declare module "@remix-run/node" {
  export interface AppLoadContext extends AppContext {}
}
