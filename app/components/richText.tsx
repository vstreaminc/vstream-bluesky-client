import * as React from "react";
import type {
  EmojiNode,
  HashtagNode,
  LinkNode,
  MentionNode,
  ParagraphNode,
  RichText,
  TextNode,
} from "~/types";
import { Link } from "react-aria-components";

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
    <span className="cursor-pointer text-blue-400 hover:underline">
      {node.handle}
    </span>
  ),
  hashtagRenderer = (node) => (
    <span className="cursor-pointer text-blue-400 hover:underline">
      {node.tag}
    </span>
  ),
  linkRenderer = (node) => (
    <Link
      href={node.href}
      className="text-blue-400 hover:underline"
      target="_blank"
      rel="noreferrer"
    >
      {node.text}
    </Link>
  ),
  richText,
}: Props) {
  const renderFn = (nodes: RichText[]): React.ReactNode => {
    return (
      <>
        {nodes.map((node) => {
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
        })}
      </>
    );
  };

  return renderFn(Array.isArray(richText) ? richText : [richText]);
}