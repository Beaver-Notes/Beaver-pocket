import { JSONContent } from "@tiptap/core";

/**
 * Recursively remove empty paragraphs from a TipTap JSONContent tree.
 * @param doc TipTap JSONContent (root 'doc')
 * @returns cleaned JSONContent
 */
export function cleanEmptyParagraphs(doc: JSONContent): JSONContent {
  if (!doc || !doc.content) return doc;

  const cleanNodes = (nodes: JSONContent[]): JSONContent[] => {
    return nodes
      .map((node) => {
        // Remove empty paragraph
        if (
          node.type === "paragraph" &&
          (!node.content || node.content.length === 0)
        ) {
          return null;
        }

        // Recursively clean children
        if (node.content) {
          node.content = cleanNodes(node.content);
        }

        return node;
      })
      .filter((node): node is JSONContent => Boolean(node)); // Type guard
  };

  return {
    ...doc,
    content: cleanNodes(doc.content),
  };
}
