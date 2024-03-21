import { Node, nodeInputRule, RawCommands } from '@tiptap/react';

export interface NoteLinkOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
      noteLink: (options: { noteId: string; noteTitle: string }) => ReturnType;
    }
  }  

export const NoteLink = Node.create({
  name: 'noteLink',

  group: 'inline', // Display inline

  inline: true, // Inline node

  atom: true, // Represents an atomic inline node, like an image

  addAttributes() {
    return {
      noteId: {
        default: null,
      },
      noteTitle: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'a[data-link-note]',
        getAttrs: (dom) => ({
          noteId: (dom as HTMLElement).getAttribute('data-id'),
          noteTitle: (dom as HTMLElement).getAttribute('data-label'),
        }),
      },
    ];
  },  

  renderHTML({ HTMLAttributes }) {
    const { noteId, noteTitle } = HTMLAttributes;

    return [
      'a',
      {
        ...HTMLAttributes,
        href: `note://${noteId}`,
      },
      ['span', { 'data-link-note': '', 'data-id': noteId, 'data-label': noteTitle }, noteTitle],
    ];
  },

  addCommands() {
    return {
      noteLink: ({ noteId, noteTitle }: { noteId: string; noteTitle: string }) => ({ commands }: { commands: any }) =>
        commands.insertContent(`<a href="note://${noteId}"><span data-link-note='' data-id='${noteId}' data-label='${noteTitle}'>${noteTitle}</span></a>`),
    } as Partial<RawCommands>;
  },  
  
  addInputRules() {
    return [
      nodeInputRule({
        find: /<a data-link-note='.*?' data-id='(.+?)' data-label='(.*?)'>.*?<\/span><\/a>/,
        type: this.type,
        getAttributes: (match) => {
          const [, noteId, noteTitle] = match;
          return { noteId, noteTitle };
        },
      }),
    ];
  },
});
