import * as React from "react";
import TLDs from "tlds";
import { linkToProfile } from "~/lib/linkHelpers";
import type {
  EmojiNode,
  HashtagNode,
  LinkNode,
  MentionNode,
  ParagraphNode,
  RichText,
  TextNode,
} from "~/types";
import { ProfileFlyout } from "./profileFlyout";
import { UnstyledLink } from "./ui/link";

type Props = {
  textRenderer?: (node: TextNode) => React.ReactNode;
  paragraphRenderer?: (
    node: ParagraphNode,
    render: (nodes: RichText[]) => React.ReactNode,
  ) => React.ReactNode;
  emojiRenderer?: (node: EmojiNode) => React.ReactNode;
  mentionRenderer?: (node: MentionNode) => React.ReactNode;
  hashtagRenderer?: (node: HashtagNode) => React.ReactNode;
  linkRenderer?: (node: LinkNode) => React.ReactNode;
  richText: RichText | RichText[];
};
export function RichTextRenderer({
  textRenderer = (node) => node.text,
  paragraphRenderer = (node, render) => <p>{render(node.nodes)}</p>,
  emojiRenderer = (_node) => {
    throw new Error("Not implemented");
  },
  mentionRenderer = (node) => (
    <ProfileFlyout profile={node}>
      {(hoverProps) => (
        <span {...hoverProps}>
          <UnstyledLink
            href={linkToProfile(node)}
            className="cursor-pointer text-blue-400 hover:underline"
          >
            {node.handle}
          </UnstyledLink>
        </span>
      )}
    </ProfileFlyout>
  ),
  hashtagRenderer = (node) => (
    <span className="cursor-pointer text-blue-400 hover:underline">
      {node.tag}
    </span>
  ),
  linkRenderer = (node) => (
    <UnstyledLink
      href={node.href}
      className="text-blue-400 hover:underline"
      target="_blank"
      rel="noopener noreferrer"
    >
      {node.text}
    </UnstyledLink>
  ),
  richText,
}: Props) {
  const renderNode = (node: RichText): React.ReactNode => {
    switch (node.$type) {
      case "text":
        return textRenderer(node);
      case "paragraph":
        return paragraphRenderer(node, renderFn);
      case "emoji":
        return emojiRenderer(node);
      case "mention":
        return mentionRenderer(node);
      case "hashtag":
        return hashtagRenderer(node);
      case "link":
        return linkRenderer(node);
      default:
        node satisfies never;
        return null;
    }
  };

  const renderFn = (nodes: RichText[]): React.ReactNode =>
    nodes.map((node, idx) => (
      <React.Fragment key={idx}>{renderNode(node)}</React.Fragment>
    ));

  return renderFn(Array.isArray(richText) ? richText : [richText]);
}

const MENTION_REGEX = /(^|\s|\()(@)([a-zA-Z0-9.-]+)(\b)/g;
const URL_REGEX =
  /(^|\s|\()((https?:\/\/[\S]+)|((?<domain>[a-z][a-z0-9]*(\.[a-z0-9]+)+)[\S]*))/gim;
const TRAILING_PUNCTUATION_REGEX = /\p{P}+$/gu;

/**
 * `\ufe0f` emoji modifier
 * `\u00AD\u2060\u200A\u200B\u200C\u200D\u20e2` zero-width spaces (likely incomplete)
 */
const TAG_REGEX =
  // eslint-disable-next-line no-misleading-character-class
  /(^|\s)[#＃]((?!\ufe0f)[^\s\u00AD\u2060\u200A\u200B\u200C\u200D\u20e2]*[^\d\s\p{P}\u00AD\u2060\u200A\u200B\u200C\u200D\u20e2]+[^\s\u00AD\u2060\u200A\u200B\u200C\u200D\u20e2]*)?/gu;

export function detectRichText(text: string): RichText[] {
  let match;
  const facets: { startPos: number; endPos: number; node: RichText }[] = [];
  {
    const re = MENTION_REGEX;
    while ((match = re.exec(text))) {
      if (!isValidDomain(match[3]) && !match[3].endsWith(".test")) {
        continue; // probably not a handle
      }
      const startPos = text.indexOf(match[3], match.index) - 1;
      const endPos = startPos + match[3].length + 1;
      facets.push({
        startPos,
        endPos,
        node: { $type: "mention", handle: "@" + match[3], did: match[3] },
      });
    }
  }
  {
    const re = URL_REGEX;
    while ((match = re.exec(text))) {
      let uri = match[2];
      if (!uri.startsWith("http")) {
        const domain = match.groups?.domain;
        if (!domain || !isValidDomain(domain)) {
          continue;
        }
        uri = `https://${uri}`;
      }
      const start = text.indexOf(match[2], match.index);
      const index = { start, end: start + match[2].length };
      // strip ending puncuation
      if (/[.,;:!?]$/.test(uri)) {
        uri = uri.slice(0, -1);
        index.end--;
      }
      if (/[)]$/.test(uri) && !uri.includes("(")) {
        uri = uri.slice(0, -1);
        index.end--;
      }
      facets.push({
        startPos: index.start,
        endPos: index.end,
        node: {
          $type: "link",
          text: text
            .slice(index.start, index.end)
            .replace(/^https?:\/\//, "")
            .toLowerCase(),
          href: uri.replace("http://", "https://").toLowerCase(),
        },
      });
    }
  }
  {
    const re = TAG_REGEX;
    while ((match = re.exec(text))) {
      const leading = match[1];
      let tag = match[2];
      if (!tag) continue;

      // strip ending punctuation and any spaces
      tag = tag.trim().replace(TRAILING_PUNCTUATION_REGEX, "");
      if (tag.length === 0 || tag.length > 64) continue;

      const startPos = match.index + leading.length;

      facets.push({
        startPos,
        endPos: startPos + 1 + tag.length,
        node: { $type: "hashtag", tag: "#" + tag },
      });
    }
  }

  // Sort facts by their startPos
  facets.sort((a, b) => a.startPos - b.startPos);

  {
    // Add missing text segments
    let startPos = 0;
    for (let i = 0; i < facets.length; i++) {
      const facet = facets[i];
      const endPos = facet.startPos;
      if (startPos !== endPos) {
        const node: TextNode = {
          $type: "text",
          text: text.slice(startPos, endPos),
        };
        facets.splice(i, 0, {
          startPos,
          endPos,
          node,
        });
        i++;
      }
      startPos = facet.endPos;
    }
    if (startPos < text.length) {
      facets.push({
        startPos,
        endPos: text.length,
        node: { $type: "text", text: text.slice(startPos, text.length) },
      });
    }
  }

  return facets.map((f) => f.node);
}

// See: https://github.com/bluesky-social/atproto/blob/c72145dbeb2d67068bc28c00a13447e0d382d121/packages/api/src/rich-text/detection.ts#L109
function isValidDomain(str: string): boolean {
  return !!TLDs.find((tld) => {
    const i = str.lastIndexOf(tld);
    if (i === -1) {
      return false;
    }
    return str.charAt(i - 1) === "." && i === str.length - tld.length;
  });
}
