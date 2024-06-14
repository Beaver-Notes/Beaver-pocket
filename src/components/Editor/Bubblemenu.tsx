import React, { useCallback } from "react";
import { Editor, BubbleMenu } from "@tiptap/react";
import icons from "../../lib/remixicon-react";

interface BubblemenuProps {
  editor: Editor | null;
}

const Bubblemenu: React.FC<BubblemenuProps> = ({
  editor
}) => {
  const setLink = useCallback(() => {
    const previousUrl = editor?.getAttributes("link").href;
    const url = window.prompt("URL", previousUrl);

    // cancelled
    if (url === null) {
      return;
    }

    // empty
    if (url === "") {
      editor?.chain().focus().extendMarkRange("link").unsetLink().run();

      return;
    }

    // update link
    editor
      ?.chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  }, [editor]);

  return (
    <>
      {editor && (
        <BubbleMenu
          editor={editor}
          className="bg-[#2D2C2C] p-1 rounded-xl"
          tippyOptions={{ duration: 100 }}
        >
          <button
            className={
              editor?.isActive("heading", { level: 1 })
                ? "p-1 text-amber-400 cursor-pointer"
                : "p-1 bg-transparent cursor-pointer"
            }
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 1 }).run()
            }
          >
            <icons.Heading1Icon
              className={
                editor?.isActive("heading", { level: 1 })
                  ? "p-1 border-none text-amber-300 text-xl w-9 h-9"
                  : "p-1 border-none text-white text-xl w-9 h-9"
              }
            />
          </button>
          <button
            className={
              editor?.isActive("heading", { level: 2 })
                ? "p-1 text-amber-400 cursor-pointer"
                : "p-1 bg-transparent cursor-pointer"
            }
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            <icons.Heading2Icon
              className={
                editor?.isActive("heading", { level: 2 })
                  ? "p-1 border-none text-amber-300 text-xl w-9 h-9"
                  : "p-1 border-none text-white text-xl w-9 h-9"
              }
            />
          </button>
          <button
            className={
              editor?.isActive("bold")
                ? "p-1 text-amber-400 cursor-pointer"
                : "p-1 bg-transparent cursor-pointer"
            }
            onClick={()=> editor?.chain().focus().toggleBold().run()}
          >
            <icons.BoldIcon
              className={
                editor?.isActive("bold")
                  ? "p-1 border-none text-amber-300 text-xl w-9 h-9"
                  : "p-1 border-none text-white text-xl w-9 h-9"
              }
            />
          </button>
          <button
            className={
              editor?.isActive("italic")
                ? "p-1 text-amber-400 cursor-pointer"
                : "p-1 bg-transparent cursor-pointer"
            }
            onClick={()=> editor?.chain().focus().toggleItalic().run()}
          >
            <icons.ItalicIcon
              className={
                editor?.isActive("italic")
                  ? "p-1 border-none text-amber-300 text-xl w-9 h-9"
                  : "p-1 border-none text-white text-xl w-9 h-9"
              }
            />
          </button>
          <button
            className={
              editor?.isActive("underline")
                ? "p-1 text-amber-400 cursor-pointer"
                : "p-1 bg-transparent cursor-pointer"
            }
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
          >
            <icons.UnderlineIcon
              className={
                editor?.isActive("underline")
                  ? "p-1 border-none text-amber-300 text-xl w-9 h-9"
                  : "p-1 border-none text-white text-xl w-9 h-9"
              }
            />
          </button>
          <button
            className={
              editor?.isActive("strike")
                ? "p-1 text-amber-400 cursor-pointer"
                : "p-1 bg-transparent cursor-pointer"
            }
            onClick={()=> editor?.chain().focus().toggleStrike().run()}
          >
            <icons.StrikethroughIcon
              className={
                editor?.isActive("strike")
                  ? "p-1 border-none text-amber-300 text-xl w-9 h-9"
                  : "p-1 border-none text-white text-xl w-9 h-9"
              }
            />
          </button>
          <button
            className={
              editor?.isActive("highlight")
                ? "p-1 text-amber-400 cursor-pointer"
                : "p-1 bg-transparent cursor-pointer"
            }
            onClick={()=> editor?.chain().focus().toggleHighlight().run()}
          >
            <icons.MarkPenLineIcon
              className={
                editor?.isActive("highlight")
                  ? "p-1 border-none text-amber-300 text-xl w-9 h-9"
                  : "p-1 border-none text-white text-xl w-9 h-9"
              }
            />
          </button>
          <button
            className={
              editor?.isActive("link")
                ? "p-1 text-amber-400 cursor-pointer"
                : "p-1 bg-transparent cursor-pointer"
            }
            onClick={setLink}
          >
          </button>
        </BubbleMenu>
      )}
    </>
  );
};
export default Bubblemenu;
