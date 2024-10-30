import http from "http";
import events from "events";
import { createRequestHandler } from "@remix-run/express";
import compression from "compression";
import express from "express";
import { createHttpTerminator, HttpTerminator } from "http-terminator";
import { ServerConfig } from "./config";
import * as AppContext from "./config/context";
import { migrateToLatest } from "./db";

export class Machine {
  public readonly ctx: AppContext.AppContext;
  public readonly app: express.Application;
  public server?: http.Server;
  private terminator?: HttpTerminator;
  private terminating = false;

  constructor(opts: { ctx: AppContext.AppContext; app: express.Application }) {
    this.ctx = opts.ctx;
    this.app = opts.app;
  }

  static async create(cfg: ServerConfig): Promise<Machine> {
    const ctx = await AppContext.fromConfig(cfg);
    await migrateToLatest(ctx.appDB);

    const viteDevServer =
      process.env.NODE_ENV === "production"
        ? undefined
        : await import("vite").then((vite) =>
            vite.createServer({
              server: { middlewareMode: true },
            }),
          );

    const remixHandler = createRequestHandler({
      build: viteDevServer
        ? () => viteDevServer.ssrLoadModule("virtual:remix/server-build")
        : // @ts-expect-error - the file might not exist yet but it will
          // eslint-disable-next-line import/no-unresolved
          await import("../build/server/remix.js"),
      getLoadContext: () => ctx,
    });

    const app = express();

    app.use(compression());

    // http://expressjs.com/en/advanced/best-practice-security.html#at-a-minimum-disable-x-powered-by-header
    app.disable("x-powered-by");

    // handle asset requests
    if (viteDevServer) {
      app.use(viteDevServer.middlewares);
    } else {
      // Vite fingerprints its assets so we can cache forever.
      app.use(
        "/assets",
        express.static("build/client/assets", {
          immutable: true,
          maxAge: "1y",
        }),
      );
    }

    // Everything else (like favicon.ico) is cached for an hour. You may want to be
    // more aggressive with this caching.
    app.use(express.static("build/client", { maxAge: "1h" }));

    // handle SSR requests
    app.all("*", remixHandler);

    return new Machine({ ctx, app });
  }

  async start(): Promise<http.Server> {
    const server = this.app.listen(this.ctx.cfg.service.port);
    this.server = server;
    this.server.keepAliveTimeout = 90000;
    this.terminator = createHttpTerminator({ server });
    await events.once(server, "listening");
    return server;
  }

  async terminate() {
    if (this.terminating) return;
    this.terminating = true;

    await this.terminator?.terminate();
    await this.ctx.appDB.destroy();
  }
}
