import { Node, mergeAttributes, ReactNodeViewRenderer } from "@tiptap/react";
import Component from "./Paper.jsx";

export default Node.create({
  name: "paper",

  group: "block",
  atom: true,

  addOptions() {
    return {
      ...this.parent?.(),
      selectable: true,
      draggable: false,
      allowGapCursor: true,
    };
  },

  addAttributes() {
    return {
      lines: { default: [] },
      height: { default: 400 },
      paperType: { default: "plain" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="paper"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "paper",
        "data-lines": JSON.stringify(HTMLAttributes.lines),
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
