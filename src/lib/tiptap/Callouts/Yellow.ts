import {
    Node,
    mergeAttributes,
    wrappingInputRule,
    RawCommands,
    ExtendedRegExpMatchArray,
  } from "@tiptap/core";
  
  export const yellowCallout = Node.create({
    name: "yellowCallout",
    group: "block",
    content: "block+",
    defining: true,
  
    addAttributes() {
      return {
        class: {
          default:
            'p-1 yellowCallout border-l-4 border-yellow-300 pl-4 bg-yellow-500 bg-opacity-10',
        },
      };
    },
  
    parseHTML() {
      return [{ tag: "div.yellowCallout" }];
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
          find: /(?:^|\s)>(\[yellow])\s?$/,
          type: this.type,
          // @ts-expect-error
          getContent: (match: ExtendedRegExpMatchArray) => {
            const [, yellow] = match;
            return yellow ? [{ type: "text", text: yellow }] : undefined;
          },
        }),
      ];
    },
  });
  