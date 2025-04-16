import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import tippy from "tippy.js";
import { createRoot } from "react-dom/client";
import NoteLabels from "../../../../components/Editor/BubblemenuLabel";
import { PluginKey } from "prosemirror-state";

interface LabelSuggestionOptions {
  uniqueLabels: string[];
}

export default Extension.create<LabelSuggestionOptions>({
  name: "labelsuggestion",

  addOptions() {
    return {
      uniqueLabels: [],
      handleAddLabel: () => {},
      suggestion: {
        char: "#",
        pluginKey: new PluginKey("label"),
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        pluginKey: new PluginKey("label-suggestion"),
        char: "#",
        items: ({ query }) => {
          console.log("Suggestion items called with query:", query);
          const queryText = query.startsWith("@@") ? query.slice(2) : query;

          const filteredLabels = (
            Array.isArray(this.options.uniqueLabels)
              ? this.options.uniqueLabels
              : []
          )
            .filter(
              (label) =>
                typeof label === "string" &&
                label.toLowerCase().includes(queryText.toLowerCase())
            )
            .slice(0, 5);

          return filteredLabels;
        },
        command: ({ editor, range, props }) => {
          editor?.chain().focus().deleteRange(range).run();
          editor?.commands.insertContent(
            `<noteLabel id="${props}" label="${props}"></noteLabel>`
          );
          const event = new CustomEvent("updateLabel", { detail: { props } });
          document.dispatchEvent(event);
        },
        render: () => {
          let popup: any;
          let root: any;

          return {
            onStart: (props: any) => {
              popup = tippy("body", {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: () => {
                  const element = document.createElement("div");
                  root = createRoot(element);

                  root.render(
                    <NoteLabels
                      uniqueLabels={this.options.uniqueLabels}
                      onClickLabel={(label) => {
                        props.command(label);
                        popup[0].hide();
                      }}
                      textAfterHash={props.query}
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
              if (root) {
                root.render(
                  <NoteLabels
                    uniqueLabels={this.options.uniqueLabels}
                    onClickLabel={(label) => {
                      props.command(label);
                      popup[0].hide();
                    }}
                    textAfterHash={props.query}
                  />
                );
              }
            },
            onKeyDown: (props: any) => {
              if (props.event.key === "Escape") {
                popup[0].hide();
                return true;
              }
              return false;
            },
            onExit: () => {
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
