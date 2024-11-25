import { Node, mergeAttributes, nodeInputRule } from "@tiptap/core";
import { RawCommands, ReactNodeViewRenderer } from "@tiptap/react";
import VideoComponent from "./VideoComponent";

const inputRegex = /!\[(.+|:?)]\((\S+)(?:(?:\s+)["'](\S+)["'])?\)/;

export default Node.create({
  name: "Video",
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
    return ReactNodeViewRenderer(VideoComponent);
  },
  addCommands() {
    return {
      setVideo:
        (src: string) =>
        ({ tr, dispatch }: any) => {
          const node = this.type.create({ src });
          const transaction = tr.replaceSelectionWith(node);
          if (transaction) {
            dispatch(transaction);
            return true;
          }
          return false;
        },
    } as Partial<RawCommands>;
  },
  addInputRules() {
    return [nodeInputRule({ find: inputRegex, type: this.type })];
  },
});
