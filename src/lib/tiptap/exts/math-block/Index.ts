import { Node, mergeAttributes, nodeInputRule } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import MathBlock from './Mathblock';

const inputRegex = /\$\$\s+$/;

export default Node.create({
  name: 'mathBlock',
  group: 'block',
  atom: true,
  addAttributes() {
    return {
      content: {
        default: '',
      },
      macros: {
        default: '{\n  \\f: "#1f(#2)"\n}',
      },
      init: {
        default: '',
      },
    };
  },
  parseHTML() {
    return [
      {
        tag: 'math-block',
      },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ['math-block', mergeAttributes(HTMLAttributes)];
  },
  addNodeView() {
    return ReactNodeViewRenderer(MathBlock);
  },
  addInputRules() {
    return [
      nodeInputRule({
        find: inputRegex,
        type: this.type,
      }),
    ];
  },
});
