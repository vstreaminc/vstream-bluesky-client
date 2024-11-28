import { Fragment, memo } from "react";
import { Link } from "react-aria-components";
import { $path } from "remix-routes";

const URL_REGEX =
  /((?:https?:\/\/)?(?:(?:[a-z0-9]?(?:[a-z0-9-]{1,61}[a-z0-9])?\.[^.|\s])+[a-z.]*[a-z]+|(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3})(?::\d{1,5})*[a-zA-Z0-9.,@_/~#&=;%+?\-\\(\\)]*)/g;
const HASH_REGEX = /(#[0-9a-zA-Z_]+)/g;
const NEWLINE_REGEX = /(\n)/g;
const HANDLE_REGEX =
  /((?<!\w)@[0-9a-zA-Z_]+\.[0-9a-zA-Z_]+\.[0-9a-zA-Z_]+)|(\w+\.bsky\.social)/g;
const MASTER_REGEX = new RegExp(
  [URL_REGEX, HASH_REGEX, NEWLINE_REGEX, HANDLE_REGEX]
    .map((x) => x.source)
    .join("|"),
  "g",
);

export const DescriptionAutoLinker = memo(function DescriptionAutoLinker({
  description,
}: {
  description?: string;
}) {
  if (!description) return null;

  return (
    <Fragment>
      {description.split(MASTER_REGEX).map((word, idx) => {
        if (NEWLINE_REGEX.test(word)) {
          return <br key={idx} />;
        } else if (URL_REGEX.test(word)) {
          return (
            <Link
              key={idx}
              className="text-blue-400"
              href={word.startsWith("http") ? word : `https://${word}`}
              rel="noopener noreferrer"
              target="_blank"
            >
              {word}
            </Link>
          );
        } else if (HASH_REGEX.test(word)) {
          return (
            <span key={idx} className="cursor-pointer text-blue-400">
              {word}
            </span>
          );
        } else if (HANDLE_REGEX.test(word)) {
          return (
            <Link
              key={idx}
              className="text-blue-400"
              href={$path("/c/:handle", { handle: word })}
            >
              {word}
            </Link>
          );
        }

        return <Fragment key={idx}>{word}</Fragment>;
      })}
    </Fragment>
  );
});
