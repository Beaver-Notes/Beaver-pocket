import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import tippy from "tippy.js";
import { createRoot } from "react-dom/client";
import BubblemenuNoteLink from "../../../../components/Editor/BubblemenuNoteLink";
import { Note } from "../../../../store/types";
import { PluginKey } from "prosemirror-state";

interface NoteSuggestionOptions {
  notes: Note[];
}

export default Extension.create<NoteSuggestionOptions>({
  name: "notesuggestion",

  addOptions() {
    return {
      notes: [],
      suggestion: {
        char: "@@",
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        pluginKey: new PluginKey("note-link"),
        char: "@@",
        items: ({ query }) => {
          console.log("Suggestion items called with query:", query);
          const queryText = query.startsWith("@@") ? query.slice(2) : query;

          const filteredNotes = this.options.notes
            .filter((note) =>
              note.title.toLowerCase().includes(queryText.toLowerCase())
            )
            .slice(0, 5);

          console.log("Filtered notes:", filteredNotes);
          return filteredNotes;
        },
        command: ({ editor, range, props }) => {
          console.log("Suggestion command called with props:", props);
          const noteId = props.id;
          const noteTitle = props.title;

          alert(range);
          editor.chain().focus().deleteRange(range).run();

          // Use the linkNote command from the editor
          //@ts-ignore
          editor.commands.linkNote({ noteId, noteTitle });
        },
        render: () => {
          let popup: any;
          let root: any;
          return {
            onStart: (props: any) => {
              console.log("Render onStart called with props:", props);
              popup = tippy("body", {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: () => {
                  const element = document.createElement("div");
                  root = createRoot(element);
                  root.render(
                    <BubblemenuNoteLink
                      notes={props.items}
                      onClickNote={(note) => {
                        props.command(note);
                        popup[0].hide();
                      }}
                      textAfterAt={props.query}
                    />
                  );
                  return element;
                },
                showOnCreate: true,
                interactive: true,
                trigger: "manual",
                placement: "bottom-start",
              });
            },
            onUpdate: (props: any) => {
              console.log("Render onUpdate called with props:", props);
              if (root) {
                root.render(
                  <BubblemenuNoteLink
                    notes={props.items}
                    onClickNote={(note) => {
                      props.command(note);
                      popup[0].hide();
                    }}
                    textAfterAt={props.query}
                  />
                );
              }
            },
            onKeyDown: (props: any) => {
              console.log("Render onKeyDown called with props:", props);
              if (props.event.key === "Escape") {
                popup[0].hide();
                return true;
              }
              return false;
            },
            onExit: () => {
              console.log("Render onExit called");
              if (root) {
                root.unmount();
              }
              popup[0].destroy();
            },
          };
        },
      }),
    ];
  },
});
