import { Node } from '@tiptap/core';

export const NoteLabel = Node.create({
  name: 'noteLabel',
  content: 'text*',
  inline: true,
  group: 'inline',
  parseHTML() {
    return [{ tag: 'note-label' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['note-label', HTMLAttributes, 0];
  },
});
