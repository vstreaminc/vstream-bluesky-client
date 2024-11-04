import {
  createIntlCache,
  createIntl as createReactIntl,
  IntlConfig,
  IntlShape,
} from "react-intl";
import { DEFAULT_LOCALE, SupportedLocale } from "./locale";
import { MetaArgs } from "@remix-run/node";

const intlCache = createIntlCache();

export function messagesForLocale(
  _locale: SupportedLocale,
): NonNullable<IntlConfig["messages"]> {
  // TODO: Fill this up with intl messages we extracted
  return {};
}

const serializeCache = new WeakMap<
  ReturnType<typeof messagesForLocale>,
  string
>();

/**
 * Serializes the VStream translations into more compact JS block
 *
 * @remarks
 * The function finds common translations between keys and hoists them into JS
 * variables declared at the top of the block. This way we only repeat
 * translations once and only once. This reduces initial payload size of HTML
 *
 * Originally based on the react-aria SSR implementation
 *
 * @see https://github.com/adobe/react-spectrum/blob/12920fc91afa90d54ae769db45a1cff4b823e1bb/packages/%40react-aria/i18n/src/server.tsx#L51
 */
export function serializeMessages(
  messages: ReturnType<typeof messagesForLocale>,
): string {
  const cached = serializeCache.get(messages);
  if (cached) {
    return cached;
  }

  // Find common strings between keys and hoist them into variables.
  const seen = new Set();
  const common = new Map();
  const stringifyCache = new Map<
    (typeof messages)[keyof typeof messages],
    string
  >();
  for (const key in messages) {
    const v = messages[key];
    // JSON stringify to add quotes around strings or turn complex object into a string
    const s = JSON.stringify(v);
    stringifyCache.set(v, s);
    if (seen.has(s) && !common.has(s)) {
      const name = String.fromCharCode(
        common.size > 25 ? common.size + 97 : common.size + 65,
      );
      common.set(s, name);
    }
    seen.add(s);
  }

  // Declare header of common variables
  let res = "{";
  if (common.size > 0) {
    res += "let ";
  }
  for (const [string, name] of common) {
    res += `${name}=${string},`;
  }
  if (common.size > 0) {
    res = res.slice(0, -1) + ";";
  }

  // Body of key => translation
  res += "window[Symbol.for('vstream.messages')]={";
  let isEmpty = true;
  for (const key in messages) {
    isEmpty = false;
    const v = messages[key];
    let s = stringifyCache.get(v)!;
    if (common.has(s)) {
      s = common.get(s);
    }
    res += `${/[ ()]/.test(key) ? JSON.stringify(key) : key}:${s},`;
  }
  if (isEmpty) {
    res += "};}";
  } else {
    // Cut off last comma and close object body
    res = res.slice(0, -1) + "};}";
  }
  serializeCache.set(messages, res);
  return res;
}

export function createIntl(locale: SupportedLocale): IntlShape {
  return createReactIntl(
    {
      locale,
      defaultLocale: DEFAULT_LOCALE,
      messages: messagesForLocale(locale),
    },
    intlCache,
  );
}

/**
 * Function we can use in our meta functions to get a `t()` object
 *
 * @remarks
 * We need this helper as meta functions do not have access to a context object
 * and cannot return a promise
 */
export function metaIntl(args: MetaArgs) {
  // matches[0] is the root route always
  const rootRoute = args.matches[0];
  const locale =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((rootRoute.data as any)?.locale as SupportedLocale | undefined) ??
    DEFAULT_LOCALE;

  return createIntl(locale);
}
