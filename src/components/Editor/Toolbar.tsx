import React, { useCallback, useEffect, useState } from "react";
import { Note } from "../../store/types";
import { Editor } from "@tiptap/react";
import ImageUploadComponent from "./ImageUpload";
import icons from "../../lib/remixicon-react";

interface ToolbarProps {
  toolbarVisible: boolean;
  note: Note;
  isFullScreen: boolean;
  noteId: string;
  onCloseEditor: () => void;
  editor: Editor | null;
  toggleHeadingTree: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  editor,
  toolbarVisible,
  isFullScreen,
  onCloseEditor,
  noteId,
  toggleHeadingTree,
}) => {
  const handleImageUpload = (imageUrl: string) => {
    editor?.chain().setImage({ src: imageUrl }).run();
  };

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

  const [wd, setwd] = useState<boolean>(
    localStorage.getItem("expand-editor") === "true"
  );

  useEffect(() => {
    setwd(localStorage.getItem("expand-editor") === "true");
  }, []);

  return (
    <>
      {toolbarVisible && (
        <div
          className={`${
            isFullScreen
              ? "overflow-auto w-full"
              : "left-16 right-0 px-60 hidden fixed pt-4 sm:block overflow-auto h-auto bg-transparent top-2 z-50 no-scrollbar"
          } ${
            wd ? "sm:px-10 md:px-10 lg:px-30" : "sm:px-10 md:px-20 lg:px-60"
          }`}
        >
          <div className="flex overflow-y-hidden w-fit p-2 md:w-full bg-[#2D2C2C] rounded-full">
            <button
              className="p-2 hidden sm:block sm:align-start rounded-md text-white bg-transparent cursor-pointer"
              onClick={onCloseEditor}
            >
              <icons.ArrowLeftLineIcon className="border-none text-white text-xl w-7 h-7" />
            </button>
            <div className="sm:mx-auto flex overflow-y-hidden w-fit">
              <button
                className={
                  editor?.isActive("bold")
                    ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                    : "p-2 rounded-md text-white bg-transparent cursor-pointer"
                }
                onClick={() => editor?.chain().focus().toggleBold().run()}
              >
                <icons.BoldIcon className="border-none text-white text-xl w-7 h-7" />
              </button>
              <button
                className={
                  editor?.isActive("italic")
                    ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                    : "p-2 rounded-md text-white bg-transparent cursor-pointer"
                }
                onClick={() => editor?.chain().focus().toggleItalic().run()}
              >
                <icons.ItalicIcon className="border-none text-white text-xl w-7 h-7" />
              </button>
              <button
                className={
                  editor?.isActive("underline")
                    ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                    : "p-2 rounded-md text-white bg-transparent cursor-pointer"
                }
                onClick={() => editor?.chain().focus().toggleUnderline().run()}
              >
                <icons.UnderlineIcon className="border-none text-white text-xl w-7 h-7" />
              </button>
              <button
                className={
                  editor?.isActive("strike")
                    ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                    : "p-2 rounded-md text-white bg-transparent cursor-pointer"
                }
                onClick={() => editor?.chain().focus().toggleStrike().run()}
              >
                <icons.StrikethroughIcon className="border-none text-white text-xl w-7 h-7" />
              </button>
              <button
                className={
                  editor?.isActive("highlight")
                    ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                    : "p-2 rounded-md text-white bg-transparent cursor-pointer"
                }
                onClick={() => editor?.chain().focus().toggleHighlight().run()}
              >
                <icons.MarkPenLineIcon className="border-none text-white text-xl w-7 h-7" />
              </button>

              <button
                className={
                  editor?.isActive("OrderedList")
                    ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                    : "p-2 rounded-md text-white bg-transparent cursor-pointer"
                }
                onClick={() =>
                  editor?.commands.insertTable({
                    rows: 3,
                    cols: 3,
                    withHeaderRow: true,
                  })
                }
              >
                <icons.Table2Icon className="border-none text-white text-xl w-7 h-7" />
              </button>
              <button
                className={
                  editor?.isActive("UnorderedList")
                    ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                    : "p-2 rounded-md text-white bg-transparent cursor-pointer"
                }
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
              >
                <icons.ListUnorderedIcon className="border-none text-white text-xl w-7 h-7" />
              </button>
              <button
                className={
                  editor?.isActive("Tasklist")
                    ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                    : "p-2 rounded-md text-white bg-transparent cursor-pointer"
                }
                onClick={() => editor?.chain().focus().toggleTaskList().run()}
              >
                <icons.ListCheck2Icon className="border-none text-white text-xl w-7 h-7" />
              </button>
              <button
                className={
                  editor?.isActive("Blockquote")
                    ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                    : "p-2 rounded-md text-white bg-transparent cursor-pointer"
                }
                onClick={() => editor?.chain().focus().toggleBlockquote().run()}
              >
                <icons.DoubleQuotesLIcon className="border-none text-white text-xl w-7 h-7" />
              </button>

              <button
                onClick={setLink}
                className={
                  "p-2 rounded-md text-white bg-transparent cursor-pointer"
                }
              >
                <icons.LinkIcon className="border-none text-white text-xl w-7 h-7" />
              </button>
              <ImageUploadComponent
                onImageUpload={handleImageUpload}
                noteId={noteId}
              />
            </div>
            <button
              className="p-2 hidden sm:block sm:align-end rounded-md text-white bg-transparent cursor-pointer"
              onClick={toggleHeadingTree}
            >
              <icons.Search2LineIcon className="border-none text-white text-xl w-7 h-7" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
export default Toolbar;
