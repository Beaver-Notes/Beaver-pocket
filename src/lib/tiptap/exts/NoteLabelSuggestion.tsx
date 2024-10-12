import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import tippy from "tippy.js";
import { createRoot } from "react-dom/client";
import NoteLabels from "../../../components/Editor/BubblemenuLabel"; // Adjust the path accordingly
import { Note } from "../../../store/types";
import { PluginKey } from "prosemirror-state";

interface LabelSuggestionOptions {
  notes: Note[];
  uniqueLabels: string[];
}

export default Extension.create<LabelSuggestionOptions>({
  name: "labelsuggestion",

  addOptions() {
    return {
      notes: [],
      uniqueLabels: [],
      handleAddLabel: () => {},
      suggestion: {
        char: "#",  // Trigger character for suggestions
        pluginKey: new PluginKey("label"),
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        pluginKey: new PluginKey('label-suggestion'),
        char: '#',  // Listening for the '#' character
        items: ({ query }) => {
          console.log("Suggestion items called with query:", query);
          
          // Extract the query text by removing the '#' character
          const queryText = query.startsWith("#") ? query.slice(1) : query;

          // Filter notes based on the query for the '#' trigger
          const filteredNotes = this.options.notes
            .filter((note) =>
              note.title.toLowerCase().includes(queryText.toLowerCase())
            )
            .slice(0, 5);

          // Convert the filtered notes to an array of strings (titles)
          const noteTitles = filteredNotes.map((note) => note.title);

          // Filter unique labels based on the query
          const filteredLabels = this.options.uniqueLabels
            .filter((label) =>
              label.toLowerCase().includes(queryText.toLowerCase())
            )
            .slice(0, 5);

          // Return either the note titles or labels based on the query
          return query.startsWith("#") ? noteTitles : filteredLabels;
        },
        command: ({ editor, range, props }) => {
          console.log("Suggestion command called with props:", props);

          // Delete the range that contains the trigger and query
          editor.chain().focus().deleteRange(range).run();

          // Insert the custom noteLabel element
          editor.commands.insertContent(
            `<noteLabel id="${props}" label="${props}"></noteLabel>`
          );

          // Dispatch an event after adding the label
          const event = new CustomEvent("updateLabel", { detail: { props } });
          document.dispatchEvent(event);
        },
        render: () => {
          let popup: any;
          let root: any;

          return {
            onStart: (props: any) => {
              console.log("Render onStart called with props:", props);

              // Create and configure the Tippy.js popup
              popup = tippy("body", {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: () => {
                  const element = document.createElement("div");
                  root = createRoot(element);

                  // Render the NoteLabels component with the current query and unique labels
                  root.render(
                    <NoteLabels
                      textAfterHash={props.query}
                      uniqueLabels={this.options.uniqueLabels}
                      onClickLabel={(label) => {
                        props.command(label);  // Insert the selected label
                        popup[0].hide();  // Hide the suggestion popup
                      }}
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
                // Update the NoteLabels component when the props change
                root.render(
                  <NoteLabels
                    textAfterHash={props.query}
                    uniqueLabels={this.options.uniqueLabels}
                    onClickLabel={(label) => {
                      props.command(label);  // Insert the selected label
                      popup[0].hide();  // Hide the suggestion popup
                    }}
                  />
                );
              }
            },
            onKeyDown: (props: any) => {
              console.log("Render onKeyDown called with props:", props);
              if (props.event.key === "Escape") {
                popup[0].hide();  // Hide the popup on Escape key
                return true;
              }
              return false;
            },
            onExit: () => {
              console.log("Render onExit called");
              if (root) {
                root.unmount();  // Unmount the React component
              }
              popup[0].destroy();  // Destroy the Tippy.js instance
            },
          };
        },
      }),
    ];
  },
});