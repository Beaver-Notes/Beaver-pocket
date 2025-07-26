import { Node, mergeAttributes, ReactNodeViewRenderer } from "@tiptap/react";
import Component from "./Paper.jsx";

export default Node.create({
  name: "paper",
  group: "block",
  atom: true,
  selectable: true,
  draggable: true,
  addAttributes() {
    return {
      lines: {
        default: [],
      },
      height: {
        default: 800,
      },
      paperType: {
        default: "plain",
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: 'div[data-type="paper"]',
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "paper",
        style: `height: ${HTMLAttributes.height}px;`,
      }),
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(Component);
  },
  addCommands() {
    return {
      insertPaper:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: "paper",
            attrs: { lines: [], height: 800 },
          });
        },
    };
  },
});
