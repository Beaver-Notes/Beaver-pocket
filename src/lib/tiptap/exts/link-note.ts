import { mergeAttributes } from "@tiptap/core";
import Suggestion from "./suggestion";
import { useNoteStore } from '@/store/note';
import { Note } from "../../../store/types";

type Item = Note;

type OnSelectParams = {
  item: Item;
  command: (args: { id: string; label: string }) => void;
  editor: any;
  range: { from: number; to: number };
};

function createProps(activeNoteId: string) {
  return {
    labelKey: "title",
    activeNoteId,
    onSelect: ({ item, command, editor, range }: OnSelectParams) => {
      const label = item.title?.trim() || item.id;
      command({ id: item.id, label });

      const { from, to } = range;
      editor
        .chain()
        .focus()
        .setTextSelection({ from, to: to - 1 })
        .setLink({ href: `note://${item.id}` })
        .setTextSelection(to)
        .run();
    }
  };
}

const configure = {
  parseHTML() {
    return [
      {
        tag: "span[data-link-note]",
      },
    ];
  },
  renderHTML(
    {
      node,
      HTMLAttributes,
    }: { node: any; HTMLAttributes?: Record<string, any> },
    options?: {
      HTMLAttributes?: Record<string, any>;
      renderLabel: (args: { options: any; node: any }) => string;
    }
  ): any[] {
    return [
      "span",
      mergeAttributes(
        { "data-link-note": "" },
        options?.HTMLAttributes ?? {},
        HTMLAttributes ?? {}
      ),
      options?.renderLabel({
        options,
        node,
      }) ?? node.attrs?.label ?? node.attrs?.id ?? "",
    ];
  },
};

function LinkNote(getActiveNoteId: () => string) {
  const props = createProps(getActiveNoteId());

  return Suggestion({ name: "linkNote", props, configure }).configure({
    renderLabel({ node }: { node: any }) {
      const label = node.attrs.label?.trim();
      return label || node.attrs.id;
    },
    suggestion: {
      char: "@@",
      items: ({ query }: { query: string }) => {
        const noteStore = useNoteStore.getState();

        const notes = Object.values(noteStore.data as Record<string, Note>);

        if (!notes.length) {
          console.log('No notes data available');
        }

        const activeNoteId = getActiveNoteId();

        return notes
          .filter(
            (item: { title: string; id: string }) =>
              item.title.toLowerCase().startsWith(query.toLowerCase()) &&
              item.id !== activeNoteId
          )
          .slice(0, 7);
      },
    },
  });
}

export default LinkNote;