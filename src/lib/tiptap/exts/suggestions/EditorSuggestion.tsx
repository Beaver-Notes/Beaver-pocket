import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import tippy from "tippy.js";
import { createRoot } from "react-dom/client";
import { PluginKey } from "prosemirror-state";
import SlashMenu from "./FloatingMenu";

interface EditorSuggestionProps {
  translations: any;
  noteId: string;
  handleAddIframe: any;
  handleImageUpload: any;
  handleFileUpload: any;
  handleVideoUpload: any;
}

export default Extension.create<EditorSuggestionProps>({
  name: "slashCommand",

  addOptions() {
    return {
      menuItems: [],
      noteId: "",
      translations: {},
      handleImageUpload: () => {},
      handleFileUpload: () => {},
      handleVideoUpload: () => {},
      handleAddIframe: () => {},
      suggestion: {
        char: "/",
        pluginKey: new PluginKey("slash-menu"),
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        pluginKey: new PluginKey("slash-suggestion"),
        char: "/", // Listening for the '/' character
        command: ({ editor, range, props }) => {
          editor.chain().focus().deleteRange(range).run();
          props.action();
        },
        render: () => {
          let popup: any;
          let root: any;
          console.log("child component", this.options.translations);

          return {
            onStart: (props: any) => {
              popup = tippy("body", {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: () => {
                  const element = document.createElement("div");
                  root = createRoot(element);

                  root.render(
                    <SlashMenu
                      noteId={this.options.noteId}
                      editor={this.editor}
                      query={props.query}
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
                  <SlashMenu
                    noteId={this.options.noteId}
                    editor={this.editor}
                    query={props.query}
                  />
                );
              }
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
