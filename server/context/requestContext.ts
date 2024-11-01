import express from "express";
import { Agent } from "@atproto/api";
import { ServerConfig } from "../config";
import { AppContext } from "./appContext";
import { redirect } from "@remix-run/node";

export function fromRequest(
  _req: express.Request,
  ctx: AppContext,
  _cfg: ServerConfig,
): RequestContext {
  const maybeLoggedInUser: RequestContext["maybeLoggedInUser"] = async (
    request,
  ) => {
    const session = await ctx.session.get(request);
    const did = session.get("did");
    if (!did) return null;

    try {
      const oauthSession = await ctx.atProtoClient.restore(did);
      return oauthSession ? new Agent(oauthSession) : null;
    } catch (err) {
      console.error(err);
      // oauth restore failed, bail and force to login again
      session.unset("did");
      throw redirect("/login", {
        headers: {
          "Set-Cookie": await ctx.session.commit(session),
        },
      });
    }
  };

  const requireLoggedInUser: RequestContext["requireLoggedInUser"] = async (
    request,
  ) => {
    const agent = await maybeLoggedInUser(request);
    if (!agent) throw redirect("/login");
    return agent;
  };

  return {
    maybeLoggedInUser,
    requireLoggedInUser,
  };
}

/**
 * A context scopped to a certain request. Is created for each incoming request
 *
 * It is available to all Remix routes
 */
export type RequestContext = {
  maybeLoggedInUser: (request: Request) => Promise<Agent | null>;
  requireLoggedInUser: (request: Request) => Promise<Agent>;
};
