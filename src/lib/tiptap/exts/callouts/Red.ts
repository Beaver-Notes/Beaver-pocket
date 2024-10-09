import {
  Node,
  mergeAttributes,
  wrappingInputRule,
  RawCommands,
  ExtendedRegExpMatchArray,
} from "@tiptap/core";

export const redCallout = Node.create({
  name: "redCallout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      class: {
        default:
          "p-1 redCallout border-l-4 border-red-300 pl-4 bg-red-500 bg-opacity-10",
      },
    };
  },

  parseHTML() {
    return [{ tag: "div.redCallout" }];
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
      setRedCallout:
        () =>
        ({ commands }: { commands: any }) => {
          return commands.wrapIn(this.name);
        },
    } as Partial<RawCommands>;
  },

  addInputRules() {
    return [
      wrappingInputRule({
        // Ensure proper type definition for find
        find: /(?:^|\s)::red\s?$/,
        type: this.type,
        // @ts-expect-error
        getContent: (match: ExtendedRegExpMatchArray) => {
          const [, blue] = match;
          return blue ? [{ type: "text", text: blue }] : undefined;
        },
      }),
    ];
  },
});
