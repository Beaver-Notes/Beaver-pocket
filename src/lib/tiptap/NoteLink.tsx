import { useState } from "react";
import { Node, Editor } from '@tiptap/core';
import { Note } from "../../store/types";
import { Plugin, PluginKey } from '@tiptap/pm/state';

const NoteLink = new Node({
  name: 'noteLink',
  inline: true,
  group: 'inline',
  draggable: true,

  toDOM: (node: Node) => ['a', { href: `note://${(node as any).attrs.noteId}` }, 0],

  parseDOM: [
    {
      tag: 'a[href^="note://"]',
      getAttrs: (dom: any) => ({
        noteId: dom.href.split('//')[1],
      }),
    },
  ],
});

const useNoteLinkPlugin = () => {
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [notesState] = useState<Record<string, Note>>({});
  const activeNote = activeNoteId ? notesState[activeNoteId] : null;

  return new Plugin({
    key: new PluginKey('noteLink'),
    nodeViews: {
      noteLink: (node: any) => {
        const dom = document.createElement('a');
        dom.href = `note://${node.attrs.noteId}`;
        dom.textContent = node.textContent;
        dom.addEventListener('click', (event) => {
          event.preventDefault();
          setActiveNoteId(node.attrs.noteId);
        });
        return {
          dom,
        };
      },
    },
    commands: {
      insertNoteLink: (noteId: string) => ({ commands }: Editor) => {
        const resolvedNoteId = noteId || 'defaultNoteId';
        return commands.insertContent(Node.create({ name: 'noteLink', attrs: { noteId: resolvedNoteId } }));
      },
    },
  });
};

const handleAtAt = ({ view, commands }: Editor) => {
  const { state } = view;
  const { selection } = state;
  if (selection && selection.from === selection.to) {
    const text = state.doc.textBetween(selection.from, selection.to, '\0');
    if (text === '@@') {
    }
  }
  return view;
};

export { NoteLink as default, useNoteLinkPlugin, handleAtAt };
