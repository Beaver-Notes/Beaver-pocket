import { Node, nodeInputRule, RawCommands } from '@tiptap/react';

export interface NoteLabelOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    noteLabel: {
      setNoteLabel: (options: { id: string; label: string | null }) => ReturnType;
    };
  }
}

export const NoteLabel = Node.create({
  name: 'noteLabel',

  group: 'inline', // This node will be displayed inline
  inline: true, // Specifies that this is an inline node
  atom: true, // Indicates that this node is atomic, i.e., it can't be split

  addAttributes() {
    return {
      id: {
        default: null, // Default value for the 'id' attribute
      },
      label: {
        default: null, // Default value for the 'label' attribute
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'noteLabel', // Custom HTML tag to identify this node
        getAttrs: (dom) => ({
          id: (dom as HTMLElement).getAttribute('id') || '',
          label: (dom as HTMLElement).getAttribute('label') || '',
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { id, label } = HTMLAttributes;

    return [
      'span', // Render the node as a <span> element
      {
        id,
        label,
        class: 'mention', // Apply the CSS class for styling
      },
      `#${label || id}`, // Display a "#" before the label or id
    ];
  },

  addCommands() {
    return {
      setNoteLabel:
        ({ id, label }: { id: string; label: string | null }) =>
        ({ commands }: { commands: any }) =>
          commands.insertContent(`<noteLabel id="${id}" label="${label}">#${label || id}</noteLabel>`),
    } as Partial<RawCommands>;
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: /<noteLabel id="([^"]+)" label="([^"]*)">#([^<]*)<\/noteLabel>/,
        type: this.type,
        getAttributes: (match) => {
          const [, id, label] = match;
          return { id, label };
        },
      }),
    ];
  },
});
