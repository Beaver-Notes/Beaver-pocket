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

  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      id: {
        default: null,
      },
      label: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'noteLabel',
        getAttrs: (dom) => ({
          id: (dom as HTMLElement).getAttribute('id') || '',
          label: (dom as HTMLElement).getAttribute('label') || '',
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { id, label } = HTMLAttributes;

    // Render a span element with a custom data attribute to differentiate from normal text
    return [
      'noteLabel',
      { id, label },
      [
        'a', 
        {
          href: `#${id}`, // or some other identifier
          class: 'mention', // Apply your desired CSS class here
        },
        `#${label || id}`,
      ],
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
        find: /<noteLabel id="([^"]+)" label="([^"]*)">(#[^<]*)<\/noteLabel>/,
        type: this.type,
        getAttributes: (match) => {
          const [, id, label] = match;
          return { id, label };
        },
      }),
    ];
  },
});
