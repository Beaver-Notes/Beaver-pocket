import { Node, mergeAttributes, ReactNodeViewRenderer } from '@tiptap/react';
import Component from './Paper.jsx';

export default Node.create({
  name: 'paper',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      lines: {
        default: [],
      },
      height: {
        default: 400, // Default height
      },
      paperType: {
        default: 'plain',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="paper"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'paper',
        style: `height: ${HTMLAttributes.height}px;`, // Set initial height via style
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(Component);
  },

  addCommands() {
    return {
      insertPaper:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: 'paper',
            attrs: { lines: [], height: 250 }, // Ensure default height is set
          });
        },
    };
  },
});
