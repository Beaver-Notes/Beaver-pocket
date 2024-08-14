import React, { useState, useEffect, useCallback } from "react";
import icons from "../../lib/remixicon-react";
import ImageUploadComponent from "./ImageUpload";
import { Editor } from "@tiptap/react";
import { Note } from "../../store/types";
import FileUploadComponent from "./FileUpload";

interface ToolbarProps {
  toolbarVisible: boolean;
  note: Note;
  noteId: string;
  editor: Editor | null;
  toggleHeadingTree: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  editor,
  toolbarVisible,
  noteId,
  toggleHeadingTree,
}) => {
  const [wd] = useState<boolean>(
    localStorage.getItem("expand-editor") === "true"
  );

  const handleImageUpload = (imageUrl: string) => {
    editor?.chain().setImage({ src: imageUrl }).run();
  };

  const handleAddIframe = () => {
    // Prompt the user for the URL
    const videoUrl = prompt("Please enter the URL of the video:");

    // Check if the user canceled or entered an empty URL
    if (!videoUrl || videoUrl.trim() === "") {
      // Prevent adding iframe if URL is empty or canceled
      return;
    }

    let formattedUrl = videoUrl.trim();

    // Check if the URL is a YouTube video URL in the regular format
    if (formattedUrl.includes("youtube.com/watch?v=")) {
      let videoId = formattedUrl.split("v=")[1];
      const ampersandPosition = videoId.indexOf("&");
      if (ampersandPosition !== -1) {
        videoId = videoId.substring(0, ampersandPosition);
      }
      // Convert to the embed format
      formattedUrl = `https://www.youtube.com/embed/${videoId}`;
    } else if (formattedUrl.includes("youtu.be/")) {
      let videoId = formattedUrl.split("youtu.be/")[1];
      const ampersandPosition = videoId.indexOf("?");
      if (ampersandPosition !== -1) {
        videoId = videoId.substring(0, ampersandPosition);
      }
      // Convert to the embed format
      formattedUrl = `https://www.youtube.com/embed/${videoId}`;
    }

    // Use the formatted URL to set the iframe source
    editor
      ?.chain()
      .focus()
      .setIframe({
        src: formattedUrl,
      })
      .run();
  };

  const handlefileUpload = (fileUrl: string, fileName: string) => {
    if (editor) {
      //@ts-expect-error
      editor.chain().setFileEmbed(fileUrl, fileName).run();
    }
  };

  const isTableCellActive = editor?.isActive("tableCell");
  const isTableHeaderActive = editor?.isActive("tableHeader");

  const isTableActive = isTableCellActive || isTableHeaderActive;

  const [isTextSelected, setIsTextSelected] = useState(false);

  useEffect(() => {
    if (!editor) return;

    const updateTextSelection = () => {
      const { from, to } = editor.state.selection;
      setIsTextSelected(from !== to);
    };

    editor.on("selectionUpdate", updateTextSelection);

    return () => {
      editor.off("selectionUpdate", updateTextSelection);
    };
  }, [editor]);

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

  if (!toolbarVisible) return null;

  return (
    <div
      className={`hidden sm:block fixed top-6 left-0 right-0 z-20 bg-[#FFFFFF] dark:bg-[#232222] dark:text-gray-50 overflow-x-auto sm:overflow-x-none py-1 ${
        wd ? "sm:px-10 md:px-10 lg:px-30" : "sm:px-10 md:px-20 lg:px-60"
      }`}
    >
      <div
        className={`w-full h-full flex items-center justify-between bg-[#2D2C2C] rounded-full  ${
          isTableActive ? "hidden" : "block"
        } ${isTextSelected ? "hidden" : "block"}`}
      >
        <button
          className="p-2 hidden sm:block sm:align-start text-white rounded-md bg-transparent cursor-pointer"
        >
          <icons.ArrowLeftLineIcon className="border-none text-white text-xl w-7 h-7" />
        </button>
        <div className="sm:mx-auto flex overflow-y-hidden w-fit">
          <button
            className={
              editor?.isActive("paragraph")
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-white bg-transparent cursor-pointer"
            }
            onClick={() => editor?.chain().focus().setParagraph().run()}
          >
            <icons.ParagraphIcon className="border-none text-white text-xl w-7 h-7" />
          </button>
          <button
            className={
              editor?.isActive("heading", { level: 1 })
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-white bg-transparent cursor-pointer"
            }
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 1 }).run()
            }
          >
            <icons.Heading1Icon className="border-none text-white text-xl w-7 h-7" />
          </button>
          <button
            className={
              editor?.isActive("heading", { level: 2 })
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-white bg-transparent cursor-pointer"
            }
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            <icons.Heading2Icon className="border-none text-white text-xl w-7 h-7" />
          </button>
          <button
            className={
              editor?.isActive("blockquote")
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-white bg-transparent cursor-pointer"
            }
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          >
            <icons.DoubleQuotesLIcon className="border-none text-white text-xl w-7 h-7" />
          </button>
          <button
            className={
              editor?.isActive("codeBlock")
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-white bg-transparent cursor-pointer"
            }
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
          >
            <icons.CodeBoxLineIcon className="border-none text-white text-xl w-7 h-7" />
          </button>
          <ImageUploadComponent
            onImageUpload={handleImageUpload}
            noteId={noteId}
          />
          <button
            className={
              editor?.isActive("Video")
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-white bg-transparent cursor-pointer"
            }
            onClick={handleAddIframe}
          >
            <icons.VideoIcon className="border-none text-white text-xl w-7 h-7" />
          </button>
          <div className="flex-1">
            <FileUploadComponent
              onFileUpload={handlefileUpload}
              noteId={noteId}
            />
          </div>
          <button
            className={
              editor?.isActive("table")
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
              editor?.isActive("bulletList")
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-white bg-transparent cursor-pointer"
            }
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          >
            <icons.ListUnorderedIcon className="border-none text-white text-xl w-7 h-7" />
          </button>
          <button
            className={
              editor?.isActive("orderedList")
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-white bg-transparent cursor-pointer"
            }
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          >
            <icons.ListOrderedIcon className="border-none text-white text-xl w-7 h-7" />
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
        </div>
        <button
          className="p-2 hidden sm:block sm:align-end rounded-md text-white bg-transparent cursor-pointer"
          onClick={toggleHeadingTree}
        >
          <icons.Search2LineIcon className="border-none text-white text-xl w-7 h-7" />
        </button>
      </div>
      <div
        className={`w-full h-full flex items-center justify-between bg-[#2D2C2C] rounded-full  ${
          isTableActive ? "block" : "hidden"
        } ${isTextSelected ? "hidden" : "block"}`}
      >
        <button
          className="p-2 hidden sm:block sm:align-start text-white rounded-md bg-transparent cursor-pointer"
        >
          <icons.ArrowLeftLineIcon className="border-none text-white text-xl w-7 h-7" />
        </button>
        <div className="sm:mx-auto flex overflow-y-hidden w-fit">
          <button
            className="p-2 rounded-md text-white bg-transparent cursor-pointer"
            onClick={() => editor?.chain().focus().addRowAfter().run()}
          >
            <icons.InsertRowBottomIcon className="border-none text-white text-xl w-7 h-7" />
          </button>
          <button
            className="p-2 rounded-md text-white bg-transparent cursor-pointer "
            onClick={() => editor?.chain().focus().addRowBefore().run()}
          >
            <icons.InsertRowTopIcon className="border-none text-white text-xl w-7 h-7" />
          </button>
          <button
            className="p-2 rounded-md text-white bg-transparent cursor-pointer "
            onClick={() => editor?.chain().focus().deleteRow().run()}
          >
            <icons.DeleteRow className="border-none text-white text-xl w-7 h-7" />
          </button>
          <button
            className="p-2 rounded-md text-white bg-transparent cursor-pointer "
            onClick={() => editor?.chain().focus().addColumnBefore().run()}
          >
            <icons.InsertColumnLeftIcon className="border-none text-white text-xl w-7 h-7" />
          </button>
          <button
            className="p-2 rounded-md text-white bg-transparent cursor-pointer "
            onClick={() => editor?.chain().focus().addColumnAfter().run()}
          >
            <icons.InsertColumnRightIcon className="border-none text-white text-xl w-7 h-7" />
          </button>
          <button
            className="p-2 rounded-md text-white bg-transparent cursor-pointer "
            onClick={() => editor?.chain().focus().deleteColumn().run()}
          >
            <icons.DeleteColumn className="border-none text-white text-xl w-7 h-7" />
          </button>
          <button
            className="p-2 rounded-md text-white bg-transparent cursor-pointer "
            onClick={() => editor?.chain().focus().toggleHeaderCell().run()}
          >
            <icons.Brush2Fill className="border-none text-white text-xl w-7 h-7" />
          </button>
          <ImageUploadComponent
            onImageUpload={handleImageUpload}
            noteId={noteId}
          />
          <button
            className="p-2 rounded-md text-white bg-transparent cursor-pointer"
            onClick={handleAddIframe}
          >
            <icons.VideoIcon className="border-none text-white text-xl w-7 h-7" />
          </button>
          <div className="flex-1">
            <FileUploadComponent
              onFileUpload={handlefileUpload}
              noteId={noteId}
            />
          </div>
          <button
            className="p-2 rounded-md text-white bg-transparent cursor-pointer"
            onClick={() => editor?.chain().focus().deleteTable().run()}
          >
            <icons.DeleteBinLineIcon className="border-none text-white text-xl w-7 h-7" />
          </button>
        </div>
        <button
          className="p-2 hidden sm:block sm:align-end rounded-md text-white bg-transparent cursor-pointer"
          onClick={toggleHeadingTree}
        >
          <icons.Search2LineIcon className="border-none text-white text-xl w-7 h-7" />
        </button>
      </div>
      <div
        className={`w-full h-full flex items-center justify-between bg-[#2D2C2C] rounded-full  ${
          isTextSelected ? "block" : "hidden"
        }`}
      >
        <button
          className="p-2 hidden sm:block sm:align-start text-white rounded-md bg-transparent cursor-pointer"
        >
          <icons.ArrowLeftLineIcon className="border-none text-white text-xl w-7 h-7" />
        </button>
        <div className="sm:mx-auto flex overflow-y-hidden w-fit">
          <button
            className={
              editor?.isActive("paragraph")
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-white bg-transparent cursor-pointer"
            }
            onClick={() => editor?.chain().focus().setParagraph().run()}
          >
            <icons.ParagraphIcon className="border-none text-white text-xl w-7 h-7" />
          </button>
          <button
            className={
              editor?.isActive("heading", { level: 1 })
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-white bg-transparent cursor-pointer"
            }
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 1 }).run()
            }
          >
            <icons.Heading1Icon className="border-none text-white text-xl w-7 h-7" />
          </button>
          <button
            className={
              editor?.isActive("heading", { level: 2 })
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-white bg-transparent cursor-pointer"
            }
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            <icons.Heading2Icon className="border-none text-white text-xl w-7 h-7" />
          </button>
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
              editor?.isActive("highlight")
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-white bg-transparent cursor-pointer"
            }
            onClick={() => editor?.commands.toggleSubscript()}
          >
            <icons.SubscriptIcon className="border-none text-white text-xl w-7 h-7" />
          </button>
          <button
            className={
              editor?.isActive("subscript")
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-white bg-transparent cursor-pointer"
            }
            onClick={() => editor?.commands.toggleSuperscript()            }
          >
            <icons.SuperscriptIcon className="border-none text-white text-xl w-7 h-7" />
          </button>
          <button
            className="p-2 hidden sm:block sm:align-end rounded-md text-white bg-transparent cursor-pointer"
            onClick={setLink}
          >
            <icons.LinkIcon className="border-none text-white text-xl w-7 h-7" />
          </button>
        </div>
        <button
          className="p-2 hidden sm:block sm:align-end rounded-md text-white bg-transparent cursor-pointer"
          onClick={toggleHeadingTree}
        >
          <icons.Search2LineIcon className="border-none text-white text-xl w-7 h-7" />
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
