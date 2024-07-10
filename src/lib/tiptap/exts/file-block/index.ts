import {
  Node,
  mergeAttributes,
  nodeInputRule,
  CommandProps,
} from "@tiptap/core";
import { RawCommands, ReactNodeViewRenderer } from "@tiptap/react";
import FileEmbedComponent from "./FileEmbedComponent";

const inputRegex = /!\[(.+|:?)]\((\S+)(?:(?:\s+)["'](\S+)["'])?\)/;

export default Node.create({
  name: "fileEmbed",
  group: "block",
  atom: true,
  addAttributes() {
    return {
      src: {
        default: null,
      },
      fileName: {
        default: null,
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: "span[data-file-name]",
        getAttrs: (el: HTMLElement) => ({
          src: el.getAttribute("data-src"),
          fileName: el.getAttribute("data-file-name"),
        }),
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes)];
  },
  addNodeView() {
    return ReactNodeViewRenderer(FileEmbedComponent);
  },
  addCommands() {
    return {
      setFileEmbed:
        (src: string, fileName: string) =>
        ({ tr, dispatch }: CommandProps) => {
          const node = this.type.create({ src, fileName });
          if (dispatch) {
            dispatch(tr.replaceSelectionWith(node));
            return true;
          }
          return false;
        },
    } as Partial<RawCommands>; // Explicitly define the return type
  },

  addInputRules() {
    return [nodeInputRule({ find: inputRegex, type: this.type })];
  },
});
