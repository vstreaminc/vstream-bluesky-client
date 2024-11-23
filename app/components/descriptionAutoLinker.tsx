import { Fragment, memo } from "react";
import { Link } from "react-aria-components";

const URL_REGEX = /(https?:\/\/[^\s]+)/g;
const HASH_REGEX = /(#[0-9a-zA-Z_]+)/g;
const NEWLINE_REGEX = /(\n)/g;
const HANDLE_REGEX = /\s(@[[0-9a-zA-Z_.]+)|\s([0-9a-zA-Z_]+\.bsky\.social)/g;
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
              className="text-blue-400"
              key={idx}
              href={word}
              target="_blank"
              rel="noopener noreferrer"
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
            <span key={idx} className="cursor-pointer text-blue-400">
              {word}
            </span>
          );
        }

        return <Fragment key={idx}>{word}</Fragment>;
      })}
    </Fragment>
  );
});
