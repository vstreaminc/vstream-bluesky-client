import { memo } from "react";
import { detectRichText, RichTextRenderer } from "./richText";

export const DescriptionAutoLinker = memo(function DescriptionAutoLinker({
  description,
}: {
  description?: string;
}) {
  if (!description) return null;

  const richText = detectRichText(description);

  return (
    <span className="whitespace-pre-wrap [overflow-wrap:break-word] [word-break:break-word]">
      <RichTextRenderer richText={richText} />
    </span>
  );
});
