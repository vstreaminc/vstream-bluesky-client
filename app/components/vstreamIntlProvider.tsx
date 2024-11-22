import * as React from "react";
import { IntlProvider } from "react-intl";
import { DEFAULT_LOCALE, type SupportedLocale } from "~/lib/locale";

export const VStreamLocaleContext = React.createContext<{
  locale: SupportedLocale;
  updateLocale: (locale: SupportedLocale) => void;
}>({
  locale: DEFAULT_LOCALE,
  updateLocale: (_locale: SupportedLocale) => undefined,
});

type IntlProviderProps = React.ComponentProps<typeof IntlProvider>;

interface Props {
  initialLocale: SupportedLocale;
  initalMessages: IntlProviderProps["messages"];
  onError?: IntlProviderProps["onError"];
  children: React.ReactNode;
}

/**
 * A superset of the "react-intl" Provider.
 *
 * @remarks
 * What different about this component is that it exposes the ability to switch
 * locales via a function that can be accesses via React Context.
 */
export function VStreamIntlProvider(props: Props) {
  const [locale, setLocale] = React.useState(props.initialLocale);
  const [messages, setMessages] = React.useState(props.initalMessages);

  const updateLocale = React.useCallback(
    (l: SupportedLocale) => {
      async function loadNewLocale() {
        const newMessages = await fetch("/api/switch-locale", {
          method: "POST",
          body: JSON.stringify({ locale: l }),
        }).then((res) => res.json());
        document.documentElement.setAttribute("lang", l);
        setLocale(l);
        setMessages(newMessages);
      }
      void loadNewLocale();
    },
    [setLocale, setMessages],
  );

  return (
    <VStreamLocaleContext.Provider value={{ locale, updateLocale }}>
      <IntlProvider
        locale={locale}
        messages={messages}
        defaultLocale={DEFAULT_LOCALE}
        onError={props.onError}
      >
        {props.children}
      </IntlProvider>
    </VStreamLocaleContext.Provider>
  );
}
