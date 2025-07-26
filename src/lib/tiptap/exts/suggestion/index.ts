import { Node, mergeAttributes } from "@tiptap/core";
import { PluginKey } from "prosemirror-state";
import Suggestion from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import tippy, { Instance as TippyInstance } from "tippy.js";
import SuggestionComponent from "./SuggestionComponent";

interface MentionNodeOptions {
  name: string;
  props?: Record<string, any>;
  configure?: Record<string, any>;
}

interface SuggestionProps {
  editor: any;
  range: any;
  query: string;
  text: string;
  items: any[];
  command: (props: any) => void;
  decorationNode: any;
  clientRect: () => DOMRect;
}

export default function createMentionNode({
  name,
  props: customProps = {},
  configure = {},
}: MentionNodeOptions) {
  return Node.create({
    name,

    addOptions() {
      return {
        HTMLAttributes: {},
        renderLabel({ options, node }: { options: any; node: any }) {
          return `${options.suggestion.char}${
            node.attrs.label ?? node.attrs.id
          }`;
        },
        suggestion: {
          char: "@",
          pluginKey: new PluginKey(name),
          render: () => {
            let component: ReactRenderer;
            let popup: TippyInstance[];

            return {
              onStart: (props: SuggestionProps) => {
                component = new ReactRenderer(SuggestionComponent, {
                  props: { ...props, ...customProps },
                  editor: props.editor,
                });

                popup = tippy("body", {
                  getReferenceClientRect: props.clientRect,
                  appendTo: () => document.body,
                  content: component.element,
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
                            "bottom-start",
                            "right-start",
                            "left-start",
                          ],
                          padding: 8,
                        },
                      },
                      {
                        name: "preventOverflow",
                        options: {
                          boundary: document.body,
                          tether: false,
                          altAxis: true,
                          padding: 8,
                        },
                      },
                      {
                        name: "offset",
                        options: {
                          offset: [0, 8],
                        },
                      },
                      {
                        name: "computeStyles",
                        options: {
                          adaptive: true,
                          roundOffsets: true,
                        },
                      },
                    ],
                  },
                  hideOnClick: false,
                  arrow: false,
                  theme: "light-border",
                  maxWidth: 320,
                  zIndex: 9999,
                  animation: "shift-away-subtle",
                  duration: [200, 150],
                });
              },

              onUpdate(props: SuggestionProps) {
                if (component) {
                  component.updateProps({ ...props, ...customProps });
                }

                if (popup && popup[0] && props.clientRect) {
                  popup[0].setProps({
                    getReferenceClientRect: props.clientRect,
                  });
                }
              },

              onKeyDown(props: { event: KeyboardEvent }) {
                if (props.event.key === "Escape") {
                  if (popup && popup[0]) {
                    popup[0].hide();
                  }
                  return true;
                }

                return (
                  (
                    component.ref as { onKeyDown?: (props: any) => boolean }
                  )?.onKeyDown?.(props) ?? false
                );
              },

              onExit() {
                if (popup && popup[0]) {
                  popup[0].destroy();
                }
                if (component) {
                  component.destroy();
                }
              },
            };
          },
          command: ({
            editor,
            range,
            props,
          }: {
            editor: any;
            range: any;
            props: any;
          }) => {
            const nodeAfter = editor.view.state.selection.$to.nodeAfter;
            const overrideSpace = nodeAfter?.text?.startsWith(" ");

            if (overrideSpace) {
              range.to += 1;
            }

            editor
              .chain()
              .focus()
              .insertContentAt(range, [
                {
                  type: name,
                  attrs: props,
                },
                {
                  type: "text",
                  text: " ",
                },
              ])
              .run();
          },
          allow: ({ editor, range }: { editor: any; range: any }) => {
            return editor.can().insertContentAt(range, { type: name });
          },
        },
      };
    },

    group: "inline",

    inline: true,

    selectable: false,

    atom: true,

    parseHTML() {
      return [
        {
          tag: `span[data-mention]`,
        },
      ];
    },

    renderHTML({ node, HTMLAttributes }: { node: any; HTMLAttributes: any }) {
      return [
        "span",
        mergeAttributes(
          { [`data-mention`]: "" },
          this.options.HTMLAttributes,
          HTMLAttributes
        ),
        this.options.renderLabel({
          options: this.options,
          node,
        }),
      ];
    },

    addAttributes() {
      return {
        id: {
          default: null,
          parseHTML: (element: HTMLElement) => {
            return {
              id: element.getAttribute("data-id"),
            };
          },
          renderHTML: (attributes: any) => {
            if (!attributes.id) {
              return {};
            }

            return {
              "data-id": attributes.id,
            };
          },
        },

        label: {
          default: null,
          parseHTML: (element: HTMLElement) => {
            return {
              label: element.getAttribute("data-label"),
            };
          },
          renderHTML: (attributes: any) => {
            if (!attributes.label) {
              return {};
            }

            return {
              "data-label": attributes.label,
            };
          },
        },
      };
    },

    renderText({ node }: { node: any }) {
      return this.options.renderLabel({
        options: this.options,
        node,
      });
    },

    addKeyboardShortcuts() {
      return {
        Backspace: () =>
          this.editor.commands.command(
            ({ tr, state }: { tr: any; state: any }) => {
              let isMention = false;
              const { selection } = state;
              const { empty, anchor } = selection;

              if (!empty) {
                return false;
              }

              state.doc.nodesBetween(
                anchor - 1,
                anchor,
                (node: any, pos: number) => {
                  if (node.type.name === this.name) {
                    isMention = true;
                    tr.insertText(
                      this.options.suggestion.char || "",
                      pos,
                      pos + node.nodeSize
                    );

                    return false;
                  }
                }
              );

              return isMention;
            }
          ),
      };
    },

    addProseMirrorPlugins() {
      return [
        Suggestion({
          editor: this.editor,
          ...this.options.suggestion,
        }),
      ];
    },
    ...configure,
  });
}
