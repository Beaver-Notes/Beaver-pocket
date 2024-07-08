import { mergeAttributes, Node, nodeInputRule, ReactNodeViewRenderer } from '@tiptap/react';
import PaperComponent from './PaperComponent';

const inputRegex = /^::draw\s+$/;

const Paperblock = Node.create({
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
    return ReactNodeViewRenderer(PaperComponent);
  },
  
  addInputRules() {
    return [nodeInputRule({ find: inputRegex, type: this.type })];
  },
});

export default Paperblock;
