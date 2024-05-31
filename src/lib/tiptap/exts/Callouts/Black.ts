import {
  Node,
  mergeAttributes,
  wrappingInputRule,
  RawCommands,
  ExtendedRegExpMatchArray,
} from "@tiptap/core";

export const blackCallout = Node.create({
  name: "blackCallout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      class: {
        default:
          "p-1 blackCallout border-l-4 border-gray-700 dark:border-gray-500 pl-4 bg-gray-900 dark:bg-gray-400 dark:bg-opacity-10 bg-opacity-10",
      },
    };
  },

  parseHTML() {
    return [{ tag: "div.blackCallout" }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, string> }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ];
  },

  addCommands() {
    return {
      setCallout:
        (attrs: Record<string, any>) =>
        ({ commands }: { commands: any }) => {
          return commands.wrapIn(this.name, attrs);
        },
      toggleCallout:
        (attrs: Record<string, any>) =>
        ({ commands }: { commands: any }) => {
          return commands.toggleWrap(this.name, attrs);
        },
      unsetCallout:
        () =>
        ({ commands }: { commands: any }) => {
          return commands.lift(this.name);
        },
    } as Partial<RawCommands>; // Explicitly define the return type
  },

  addInputRules() {
    return [
      wrappingInputRule({
        // Ensure proper type definition for find
        find: /(?:^|\s)>(\[black])\s?$/,
        type: this.type,
        // @ts-expect-error
        getContent: (match: ExtendedRegExpMatchArray) => {
          const [, black] = match;
          return black ? [{ type: "text", text: black }] : undefined;
        },
      }),
    ];
  },
});
