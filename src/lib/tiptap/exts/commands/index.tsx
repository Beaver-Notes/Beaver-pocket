import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import tippy from "tippy.js";
import { createRoot } from "react-dom/client";
import { PluginKey } from "prosemirror-state";
import Commands from "./Commands";

interface CommandsProps {
  translations: any;
  noteId: string;
  handleAddIframe: any;
  handleImageUpload: any;
  handleFileUpload: any;
  handleVideoUpload: any;
  editor: any;
  range: any;
  query: string;
  text: string;
  items: any[];
  command: (props: any) => void;
  decorationNode: any;
  clientRect: () => DOMRect;
}

export default Extension.create<CommandsProps>({
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
      editor: null,
      range: null,
      query: "",
      text: "",
      items: [],
      command: () => {},
      decorationNode: null,
      clientRect: () => new DOMRect(),
      suggestion: {
        char: "/",
        pluginKey: new PluginKey("commands"),
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        pluginKey: new PluginKey("commands"),
        char: "/",
        command: ({ editor, range, props }) => {
          editor.chain().focus().deleteRange(range).run();
          props.action();
        },
        render: () => {
          let popup: any;
          let root: any;

          return {
            onStart: (props: any) => {
              const wrapper = document.createElement("div");
              wrapper.style.position = "absolute";
              wrapper.style.zIndex = "9999";

              popup = tippy("body", {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: wrapper,
                showOnCreate: true,
                interactive: true,
                trigger: "manual",
                placement: "bottom-start",
                popperOptions: {
                  strategy: "absolute",
                  modifiers: [
                    {
                      name: "flip",
                      options: {
                        boundary: document.body,
                        fallbackPlacements: [
                          "top-start",
                          "bottom-end",
                          "top-end",
                        ],
                      },
                    },
                    {
                      name: "preventOverflow",
                      options: {
                        boundary: document.body,
                        tether: false,
                        altAxis: true,
                      },
                    },
                    {
                      name: "offset",
                      options: {
                        offset: [0, 8],
                      },
                    },
                  ],
                },
                hideOnClick: false,
                arrow: false,
                theme: "light",
                maxWidth: "none",
              });

              root = createRoot(wrapper);
              root.render(
                <Commands
                  noteId={this.options.noteId}
                  editor={this.editor}
                  query={props.query}
                  range={props.range}
                />
              );
            },

            onUpdate: (props: any) => {
              if (root) {
                root.render(
                  <Commands
                    noteId={this.options.noteId}
                    editor={this.editor}
                    query={props.query}
                    range={props.range}
                  />
                );
              }

              if (popup && popup[0] && props.clientRect) {
                popup[0].setProps({
                  getReferenceClientRect: props.clientRect,
                });
              }
            },

            onExit: () => {
              if (root) {
                root.unmount();
              }
              if (popup && popup[0]) {
                popup[0].destroy();
              }
            },
          };
        },
      }),
    ];
  },
});
