import * as fs from "fs";
import stringify from "json-stable-stringify";
import {
  createIntlCache,
  createIntl as createReactIntl,
  IntlConfig,
  IntlShape,
} from "react-intl";
import { DEFAULT_LOCALE, SupportedLocale } from "./locale";
import { memoizeBasic1 } from "./memoize";

const intlCache = createIntlCache();

const _messagesForLocale = (
  locale: SupportedLocale,
): NonNullable<IntlConfig["messages"]> => {
  const localeToLoad = ((): SupportedLocale => {
    switch (locale) {
      case "en":
        return "en-US";
      case "es":
        return "es-ES";
      case "ja":
        return "ja-JP";
      case "ko":
        return "ko-KR";
      default:
        return locale;
    }
  })();

  try {
    return JSON.parse(
      fs.readFileSync(`./.compiled-lang/${localeToLoad}.json`, "utf8"),
    );
  } catch (err) {
    if (
      locale !== DEFAULT_LOCALE &&
      err instanceof Error &&
      "code" in err &&
      err.code === "ENOENT"
    ) {
      return messagesForLocale(DEFAULT_LOCALE);
    }
    throw err;
  }
};

export const messagesForLocale =
  process.env.NODE_ENV === "production"
    ? // Only memoize in production, otherwise make sure we're always loading most
      // recent locales
      memoizeBasic1(_messagesForLocale)
    : _messagesForLocale;

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
    const s = stringify(v);
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
