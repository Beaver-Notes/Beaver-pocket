import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import MarkdownIt from "markdown-it";
import { generateJSON } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";

export const Paste = Extension.create({
  name: "paste",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("Paste"),
        props: {
          handleDOMEvents: {
            paste: (view, event) => {
              const { editor } = this;
              if (!editor) return false;

              const clipboardData = event.clipboardData;
              if (!clipboardData) return false;

              const hasNonTextContent = Array.from(clipboardData.items).some(
                (item) => !item.type.startsWith("text/")
              );

              if (hasNonTextContent) {
                return false;
              }

              if (clipboardData.getData("text/html")) {
                return false;
              }
              const text = clipboardData.getData("text/plain");
              if (!text) return false;
              try {
                const md = new MarkdownIt();
                const parsedHtml = md.render(text);

                event.preventDefault();

                const json = generateJSON(parsedHtml, [
                  StarterKit,
                  Link.configure({ openOnClick: false }),
                ]);

                editor.commands.insertContent("", {
                  parseOptions: { preserveWhitespace: false },
                });

                editor.commands.insertContent(json, {
                  parseOptions: { preserveWhitespace: false },
                });

                return true;
              } catch (error) {
                console.error("Error processing markdown:", error);
                return false;
              }
            },
          },
        },
      }),
    ];
  },
});
