import { Node } from '@tiptap/core';

const labels = Node.create({
  name: 'labels',
  content: 'text*',
  inline: true,
  group: 'inline',
  parseHTML() {
    return [{ tag: 'labels' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['note-label', HTMLAttributes, 0];
  },
});

export default labels;