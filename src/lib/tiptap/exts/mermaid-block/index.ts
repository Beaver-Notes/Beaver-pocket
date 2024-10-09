import {
  Node,
  mergeAttributes,
  nodeInputRule,
  RawCommands,
} from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import MermaidComponent from "./MermaidComponent"; // Assuming you have this component from the previous conversion

const inputRegex = /^::mermaid\s+$/;

const MermaidDiagram = Node.create({
  name: "mermaidDiagram",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      content: {
        default: "",
      },
      init: {
        default: "",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "mermaid-diagram",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["mermaid-diagram", mergeAttributes(HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidComponent);
  },

  addInputRules() {
    return [nodeInputRule({ find: inputRegex, type: this.type })];
  },

  // Adding commands to create a mermaid diagram
  addCommands() {
    return {
      setMermaidDiagram:
        () =>
        ({ commands }: { commands: any }) => {
          return commands.insertContent({ type: this.name });
        },
    } as Partial<RawCommands>;
  },
});

export default MermaidDiagram;
