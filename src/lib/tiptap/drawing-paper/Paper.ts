import { mergeAttributes, Node, ReactNodeViewRenderer } from '@tiptap/react';
import Component from './Component';

interface PaperAttributes {
  lines: any[]; // Adjust the type based on the actual structure of your lines data
}

export default Node.create<PaperAttributes>({
  name: 'paper',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      lines: {
        default: [],
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
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'paper' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(Component);
  },
});
