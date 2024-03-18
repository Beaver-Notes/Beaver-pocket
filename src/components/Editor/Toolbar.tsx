import React, { useCallback } from "react";
import { Note } from "../../store/types";
import { Editor } from "@tiptap/react";
import ImageUploadComponent from "./ImageUpload";

// Icons
import BoldIcon from "remixicon-react/BoldIcon";
import MarkPenLineIcon from "remixicon-react/MarkPenLineIcon";
import Table2Icon from "remixicon-react/Table2Icon";
import ItalicIcon from "remixicon-react/ItalicIcon";
import UnderlineIcon from "remixicon-react/UnderlineIcon";
import StrikethroughIcon from "remixicon-react/StrikethroughIcon";
import ListUnorderedIcon from "remixicon-react/ListUnorderedIcon";
import ListCheck2Icon from "remixicon-react/ListCheck2Icon";
import DoubleQuotesLIcon from "remixicon-react/DoubleQuotesLIcon";
import LinkIcon from "remixicon-react/LinkMIcon";
import Search2LineIcon from "remixicon-react/Search2LineIcon";
import ArrowLeftLineIcon from "remixicon-react/ArrowLeftLineIcon";

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

  return (
    <>
      {toolbarVisible && (
        <div
          className={
            isFullScreen
              ? "overflow-auto w-full"
              : "hidden pt-4 sm:block inset-x-2 bottom-6 overflow-auto h-auto w-full bg-transparent top-0 z-50 no-scrollbar"
          }
        >
          <div className="flex overflow-y-hidden w-fit p-2 md:w-full bg-[#2D2C2C] rounded-full">
          <button
                className="p-2 hidden sm:block sm:align-start rounded-md text-white bg-transparent cursor-pointer"
                onClick={onCloseEditor}
              >
                <ArrowLeftLineIcon className="border-none text-white text-xl w-7 h-7" />
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
                <BoldIcon className="border-none text-white text-xl w-7 h-7" />
              </button>
              <button
                className={
                  editor?.isActive("italic")
                    ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                    : "p-2 rounded-md text-white bg-transparent cursor-pointer"
                }
                onClick={() => editor?.chain().focus().toggleItalic().run()}
              >
                <ItalicIcon className="border-none text-white text-xl w-7 h-7" />
              </button>
              <button
                className={
                  editor?.isActive("underline")
                    ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                    : "p-2 rounded-md text-white bg-transparent cursor-pointer"
                }
                onClick={() => editor?.chain().focus().toggleUnderline().run()}
              >
                <UnderlineIcon className="border-none text-white text-xl w-7 h-7" />
              </button>
              <button
                className={
                  editor?.isActive("strike")
                    ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                    : "p-2 rounded-md text-white bg-transparent cursor-pointer"
                }
                onClick={() => editor?.chain().focus().toggleStrike().run()}
              >
                <StrikethroughIcon className="border-none text-white text-xl w-7 h-7" />
              </button>
              <button
                className={
                  editor?.isActive("highlight")
                    ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                    : "p-2 rounded-md text-white bg-transparent cursor-pointer"
                }
                onClick={() => editor?.chain().focus().toggleHighlight().run()}
              >
                <MarkPenLineIcon className="border-none text-white text-xl w-7 h-7" />
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
                <Table2Icon className="border-none text-white text-xl w-7 h-7" />
              </button>
              <button
                className={
                  editor?.isActive("UnorderedList")
                    ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                    : "p-2 rounded-md text-white bg-transparent cursor-pointer"
                }
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
              >
                <ListUnorderedIcon className="border-none text-white text-xl w-7 h-7" />
              </button>
              <button
                className={
                  editor?.isActive("Tasklist")
                    ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                    : "p-2 rounded-md text-white bg-transparent cursor-pointer"
                }
                onClick={() => editor?.chain().focus().toggleTaskList().run()}
              >
                <ListCheck2Icon className="border-none text-white text-xl w-7 h-7" />
              </button>
              <button
                className={
                  editor?.isActive("Blockquote")
                    ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                    : "p-2 rounded-md text-white bg-transparent cursor-pointer"
                }
                onClick={() => editor?.chain().focus().toggleBlockquote().run()}
              >
                <DoubleQuotesLIcon className="border-none text-white text-xl w-7 h-7" />
              </button>

              <button
                onClick={setLink}
                className={
                  "p-2 rounded-md text-white bg-transparent cursor-pointer"
                }
              >
                <LinkIcon className="border-none text-white text-xl w-7 h-7" />
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
              <Search2LineIcon className="border-none text-white text-xl w-7 h-7" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
export default Toolbar;
