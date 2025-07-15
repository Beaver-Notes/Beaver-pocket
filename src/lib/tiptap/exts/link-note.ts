import { mergeAttributes } from "@tiptap/core";
import Suggestion from "./suggestion";
import { Note } from "../../../store/types";

type Item = Note;

type OnSelectParams = {
  item: Item;
  command: (args: { id: string; label: string }) => void;
  editor: any;
  range: { from: number; to: number };
};

function createProps(notes: Item[], activeNoteId: string) {
  return {
    labelKey: "title",
    notes,
    activeNoteId,
    onSelect: ({ item, command, editor, range }: OnSelectParams) => {
      command({ id: item.id, label: item.title });

      const { from, to } = range;
      editor
        .chain()
        .focus()
        .setTextSelection({ from, to: to - 1 })
        .setLink({ href: `note://${item.id}` })
        .setTextSelection(to)
        .run();
    },
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

function LinkNote(notes: Item[], currentNoteId: string) {
  const props = createProps(notes, currentNoteId);

  return Suggestion({ name: "linkNote", props, configure }).configure({
    renderLabel({ node }: { node: any }) {
      return node.attrs.label ?? node.attrs.id;
    },
    suggestion: {
      char: "@@",
      items: ({ query }: { query: string }) => {
        return props.notes
          .filter(
            (item) =>
              item.title.toLowerCase().startsWith(query.toLowerCase()) &&
              item.id !== props.activeNoteId
          )
          .slice(0, 7);
      },
    },
  });
}

export default LinkNote;