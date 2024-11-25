import {
    Node,
    mergeAttributes,
    wrappingInputRule,
    RawCommands,
    ExtendedRegExpMatchArray,
  } from "@tiptap/core";
  
  export const purpleCallout = Node.create({
    name: "purpleCallout",
    group: "block",
    content: "block+",
    defining: true,
  
    addAttributes() {
      return {
        class: {
          default:
            'p-1 purpleCallout border-l-4 border-purple-300 pl-4 bg-purple-500 bg-opacity-10',
        },
      };
    },
  
    parseHTML() {
      return [{ tag: "div.purpleCallout" }];
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
        setPurpleCallout:
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
          find: /(?:^|\s)::purple\s?$/,
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
  