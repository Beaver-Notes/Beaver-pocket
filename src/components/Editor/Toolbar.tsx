import React, { useState, useEffect, useCallback } from "react";
import icons from "../../lib/remixicon-react";
import ImageUploadComponent from "./ImageUpload";
import { Editor } from "@tiptap/react";
import { Note } from "../../store/types";
import FileUploadComponent from "./FileUpload";
import AudioUploadComponent from "./AudioUpload";
import VideoUploadComponent from "./VideoUpload";
import { Link } from "react-router-dom";

interface ToolbarProps {
  toolbarVisible: boolean;
  note: Note;
  noteId: string;
  editor: Editor | null;
}

const Toolbar: React.FC<ToolbarProps> = ({
  editor,
  toolbarVisible,
  noteId,
}) => {
  const [translations, setTranslations] = useState({
    editor: {
      embedUrl: "editor.embedUrl",
    },
  });

  useEffect(() => {
    const loadTranslations = async () => {
      const selectedLanguage = localStorage.getItem("selectedLanguage") || "en";
      try {
        const translationModule = await import(
          `../../assets/locales/${selectedLanguage}.json`
        );

        setTranslations({ ...translations, ...translationModule.default });
      } catch (error) {
        console.error("Error loading translations:", error);
      }
    };

    loadTranslations();
  }, []);
  const [wd] = useState<boolean>(
    localStorage.getItem("expand-editor") === "true"
  );

  const handleImageUpload = (imageUrl: string) => {
    editor?.chain().setImage({ src: imageUrl }).run();
  };

  const handleAddIframe = () => {
    const videoUrl = prompt(`${translations.editor.embedUrl}`);
    if (!videoUrl || videoUrl.trim() === "") {
      return;
    }

    let formattedUrl = videoUrl.trim();
    if (formattedUrl.includes("youtube.com/watch?v=")) {
      let videoId = formattedUrl.split("v=")[1];
      const ampersandPosition = videoId.indexOf("&");
      if (ampersandPosition !== -1) {
        videoId = videoId.substring(0, ampersandPosition);
      }
      formattedUrl = `https://www.youtube.com/embed/${videoId}`;
    } else if (formattedUrl.includes("youtu.be/")) {
      let videoId = formattedUrl.split("youtu.be/")[1];
      const ampersandPosition = videoId.indexOf("?");
      if (ampersandPosition !== -1) {
        videoId = videoId.substring(0, ampersandPosition);
      }
      formattedUrl = `https://www.youtube.com/embed/${videoId}`;
    }

    editor?.chain().focus().setIframe({ src: formattedUrl }).run();
  };

  const handlefileUpload = (fileUrl: string, fileName: string) => {
    if (editor) {
      //@ts-expect-error
      editor.chain().setFileEmbed(fileUrl, fileName).run();
    }
  };

  const handlevideoUpload = (fileUrl: string) => {
    if (editor) {
      //@ts-expect-error
      editor.chain().setVideo(fileUrl).run();
    }
  };

  const handleaudioUpload = (fileUrl: string) => {
    if (editor) {
      //@ts-expect-error
      editor.chain().setAudio(fileUrl).run();
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

  const handleMouseDown = (
    event: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    event.preventDefault();
  };

  const showFind = () => {
    const event = new CustomEvent("showFind");
    document.dispatchEvent(event);
  };

  return (
    <div
      className={`drawer hidden sm:block fixed top-6 left-0 right-0 z-20 bg-[#FFFFFF] dark:bg-[#232222] dark:text-gray-50 overflow-x-auto sm:overflow-x-none py-1 ${
        wd ? "sm:px-10 md:px-10 lg:px-30" : "sm:px-10 md:px-20 lg:px-60"
      }`}
    >
      <div
        className={`w-full h-full flex items-center justify-between bg-[#2D2C2C] rounded-full  ${
          isTableActive ? "hidden" : "block"
        } ${isTextSelected ? "hidden" : "block"}`}
      >
        <Link
          to="/"
          className="p-2 hidden sm:block sm:align-start text-[color:var(--selected-dark-text)] rounded-md bg-transparent cursor-pointer"
        >
          <icons.ArrowLeftLineIcon className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
        </Link>
        <div className="sm:mx-auto flex overflow-y-hidden w-fit">
          <button
            className={
              editor?.isActive("paragraph")
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            }
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().setParagraph().run()}
          >
            <icons.ParagraphIcon className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
          </button>
          <button
            className={
              editor?.isActive("heading", { level: 1 })
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            }
            onMouseDown={handleMouseDown}
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 1 }).run()
            }
          >
            <icons.Heading1Icon className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
          </button>
          <button
            className={
              editor?.isActive("heading", { level: 2 })
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            }
            onMouseDown={handleMouseDown}
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            <icons.Heading2Icon className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
          </button>
          <button
            className={
              editor?.isActive("blockquote")
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            }
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          >
            <icons.DoubleQuotesLIcon className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
          </button>
          <button
            className={
              editor?.isActive("codeBlock")
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            }
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
          >
            <icons.CodeBoxLineIcon className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
          </button>
          {/* Media and File Upload Options */}
          <ImageUploadComponent
            onImageUpload={handleImageUpload}
            noteId={noteId}
          />
          <button
            className={`p-1 ${
              editor?.isActive("Embed")
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={handleAddIframe}
          >
            <icons.PagesLineIcon className="border-none text-xl text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
          </button>
          <FileUploadComponent
            onFileUpload={handlefileUpload}
            noteId={noteId}
          />
          <VideoUploadComponent
            onVideoUpload={handlevideoUpload}
            noteId={noteId}
          />
          <AudioUploadComponent
            onAudioUpload={handleaudioUpload}
            noteId={noteId}
          />
          {/* List and Table Options */}
          <button
            className={
              editor?.isActive("table")
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            }
            onMouseDown={handleMouseDown}
            onClick={() =>
              editor?.commands.insertTable({
                rows: 3,
                cols: 3,
                withHeaderRow: true,
              })
            }
          >
            <icons.Table2Icon className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
          </button>
          <button
            className={
              editor?.isActive("bulletList")
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            }
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          >
            <icons.ListUnorderedIcon className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
          </button>
          <button
            className={
              editor?.isActive("orderedList")
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            }
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          >
            <icons.ListOrderedIcon className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
          </button>
          <button
            className={
              editor?.isActive("orderedList")
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            }
            onMouseDown={handleMouseDown}
            // @ts-ignore
            onClick={() => editor?.chain().focus().insertPaper().run()}
          >
            <icons.Brush2Fill className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
          </button>
          <button
            className={
              editor?.isActive("Tasklist")
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            }
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().toggleTaskList().run()}
          >
            <icons.ListCheck2Icon className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
          </button>
        </div>
        <button
          className="p-2 hidden sm:block sm:align-end rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
          onClick={showFind}
        >
          <icons.Search2LineIcon className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
        </button>
      </div>
      <div
        className={`w-full h-full flex items-center justify-between bg-[#2D2C2C] rounded-full  ${
          isTableActive ? "block" : "hidden"
        } ${isTextSelected ? "hidden" : "block"}`}
      >
        <Link
          to="/"
          className="p-2 hidden sm:block sm:align-start text-[color:var(--selected-dark-text)] rounded-md bg-transparent cursor-pointer"
        >
          <icons.ArrowLeftLineIcon className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
        </Link>
        <div className="sm:mx-auto flex overflow-y-hidden w-fit">
          <button
            className="p-2 rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().addRowAfter().run()}
          >
            <icons.InsertRowBottomIcon className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
          </button>
          <button
            className="p-2 hidden sm:block sm:align-end rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().addRowBefore().run()}
          >
            <icons.InsertRowTopIcon className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
          </button>
          <button
            className="p-2 hidden sm:block sm:align-end rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().deleteRow().run()}
          >
            <icons.DeleteRow className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
          </button>
          <button
            className="p-2 hidden sm:block sm:align-end rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().addColumnBefore().run()}
          >
            <icons.InsertColumnLeftIcon className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
          </button>
          <button
            className="p-2 hidden sm:block sm:align-end rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().addColumnAfter().run()}
          >
            <icons.InsertColumnRightIcon className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
          </button>
          <button
            className="p-2 hidden sm:block sm:align-end rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().deleteColumn().run()}
          >
            <icons.DeleteColumn className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
          </button>
          <button
            className="p-2 hidden sm:block sm:align-end rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().toggleHeaderCell().run()}
          >
            <icons.Brush2Fill className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
          </button>
          {/* Media and File Upload Options */}
          <ImageUploadComponent
            onImageUpload={handleImageUpload}
            noteId={noteId}
          />
          <button
            className={`p-1 ${
              editor?.isActive("Embed")
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={handleAddIframe}
          >
            <icons.PagesLineIcon className="border-none text-xl text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
          </button>
          <FileUploadComponent
            onFileUpload={handlefileUpload}
            noteId={noteId}
          />
          <VideoUploadComponent
            onVideoUpload={handlevideoUpload}
            noteId={noteId}
          />
          <button
            className={`p-1 ${
              editor?.isActive("Tasklist")
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            } cursor-pointer flex-1 pr-6`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().deleteTable().run()}
          >
            <icons.DeleteBinLineIcon className="border-none text-xl text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
          </button>
        </div>
        <button
          className="p-2 hidden sm:block sm:align-end rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
          onClick={showFind}
        >
          <icons.Search2LineIcon className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
        </button>
      </div>
      <div
        className={`w-full h-full flex items-center justify-between bg-[#2D2C2C] rounded-full  ${
          isTextSelected ? "block" : "hidden"
        }`}
      >
        <Link
          to="/"
          className="p-2 hidden sm:block sm:align-start text-[color:var(--selected-dark-text)] rounded-md bg-transparent cursor-pointer"
        >
          <icons.ArrowLeftLineIcon className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
        </Link>
        <div className="sm:mx-auto flex overflow-y-hidden w-fit">
          <button
            className={
              editor?.isActive("paragraph")
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            }
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().setParagraph().run()}
          >
            <icons.ParagraphIcon className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
          </button>
          <button
            className={
              editor?.isActive("heading", { level: 1 })
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            }
            onMouseDown={handleMouseDown}
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 1 }).run()
            }
          >
            <icons.Heading1Icon className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
          </button>
          <button
            className={
              editor?.isActive("heading", { level: 2 })
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            }
            onMouseDown={handleMouseDown}
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            <icons.Heading2Icon className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
          </button>
          <button
            className={
              editor?.isActive("bold")
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            }
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            <icons.BoldIcon className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
          </button>
          <button
            className={
              editor?.isActive("italic")
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            }
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            <icons.ItalicIcon className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
          </button>
          <button
            className={
              editor?.isActive("underline")
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            }
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
          >
            <icons.UnderlineIcon className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
          </button>
          <button
            className={
              editor?.isActive("strike")
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            }
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().toggleStrike().run()}
          >
            <icons.StrikethroughIcon className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
          </button>
          <button
            className={
              editor?.isActive("highlight")
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            }
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().toggleHighlight().run()}
          >
            <icons.MarkPenLineIcon className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
          </button>
          <button
            className={`p-1 ${
              editor?.isActive("bulletList")
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          >
            <icons.ListUnorderedIcon className="border-none text-xl text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
          </button>
          <button
            className={`p-1 ${
              editor?.isActive("Tasklist")
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.chain().focus().toggleTaskList().run()}
          >
            <icons.ListCheck2Icon className="border-none text-xl text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
          </button>
          <button
            className={`p-1 ${
              editor?.isActive("subscript")
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.commands.toggleSubscript()}
          >
            <icons.SubscriptIcon className="border-none text-xl text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
          </button>
          <button
            className={`p-1 ${
              editor?.isActive("superscript")
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            } cursor-pointer flex-1`}
            onMouseDown={handleMouseDown}
            onClick={() => editor?.commands.toggleSuperscript()}
          >
            <icons.SuperscriptIcon className="border-none text-xl text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
          </button>
          <button
            className={`p-1 ${
              editor?.isActive("highlight")
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
            } cursor-pointer flex-1 pr-6`}
            onMouseDown={handleMouseDown}
            onClick={setLink}
          >
            <icons.LinkIcon className="border-none text-xl text-[color:var(--selected-dark-text)] w-8 h-8 cursor-pointer" />
          </button>
        </div>
        <button
          className="p-2 hidden sm:block sm:align-end rounded-md text-[color:var(--selected-dark-text)] bg-transparent cursor-pointer"
          onClick={showFind}
        >
          <icons.Search2LineIcon className="border-none text-[color:var(--selected-dark-text)] text-xl w-7 h-7" />
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
