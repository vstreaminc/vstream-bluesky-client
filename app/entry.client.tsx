/**
 * More information, see https://remix.run/file-conventions/entry.client
 */

import { RemixBrowser } from "@remix-run/react";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { DEFAULT_LOCALE, SupportedLocale } from "./lib/locale";
import { VStreamIntlProvider } from "./components/vstreamIntlProvider";
import { IntlConfig } from "react-intl";

function start() {
  const locale =
    (document.documentElement.getAttribute("lang") as SupportedLocale | null) ??
    DEFAULT_LOCALE;

  const messages =
    // @ts-expect-error We know what we're doing getting these messages
    (window[Symbol.for("vstream.messages")] as IntlConfig["messages"]) ?? {};

  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <VStreamIntlProvider initialLocale={locale} initalMessages={messages}>
          <RemixBrowser />
        </VStreamIntlProvider>
      </StrictMode>,
    );
  });
}

start();
