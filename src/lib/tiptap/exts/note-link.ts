import { Extension, RawCommands } from "@tiptap/core";

export const linkNote = Extension.create({
  name: "linkNote",

  addCommands() {
    return {
      linkNote:
        ({ noteId, noteTitle }: { noteId: string; noteTitle: string }) =>
        ({
          chain,
          state,
        }: {
          chain: () => any;
          state: { selection: { from: number } };
        }) => {
          const { from } = state.selection;

          return chain()
            .focus()
            .insertContent(noteTitle)
            .setTextSelection({ from, to: from + noteTitle.length })
            .extendMarkRange("link")
            .setLink({ href: `note://${noteId}` })
            .run();
        },
    } as Partial<RawCommands>;
  },
});
