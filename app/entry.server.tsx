/**
 * More information, see https://remix.run/file-conventions/entry.server
 */

import { PassThrough } from "node:stream";
import { getLocalizationScript } from "react-aria-components/i18n";
import type { AppLoadContext, EntryContext } from "@remix-run/node";
import { createReadableStreamFromReadable } from "@remix-run/node";
import { RemixServer } from "@remix-run/react";
import { isbot } from "isbot";
import { renderToPipeableStream } from "react-dom/server";
import { DEFAULT_LOCALE } from "./lib/locale";
import { messagesForLocale, serializeMessages } from "./lib/locale.server";
import { VStreamIntlProvider } from "./components/vstreamIntlProvider";

const ABORT_DELAY = 5_000;

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
  _loadContext: AppLoadContext,
) {
  const locale =
    remixContext.staticHandlerContext.loaderData.root?.locale ?? DEFAULT_LOCALE;
  const messages = messagesForLocale(locale);

  const callbackName = isbot(request.headers.get("user-agent") ?? "")
    ? "onAllReady"
    : "onShellReady";

  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      <VStreamIntlProvider initialLocale={locale} initalMessages={messages}>
        <RemixServer
          context={remixContext}
          url={request.url}
          abortDelay={ABORT_DELAY}
        />
      </VStreamIntlProvider>,
      {
        bootstrapScriptContent:
          getLocalizationScript(locale) + serializeMessages(messages),
        [callbackName]() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set("Content-Type", "text/html");

          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );

          pipe(body);
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          responseStatusCode = 500;
          // Log streaming rendering errors from inside the shell.  Don't log
          // errors encountered during initial shell rendering since they'll
          // reject and get logged in handleDocumentRequest.
          if (shellRendered) {
            console.error(error);
          }
        },
      },
    );

    setTimeout(abort, ABORT_DELAY);
  });
}
