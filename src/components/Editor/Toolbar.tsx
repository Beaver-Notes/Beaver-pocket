import React, { useState } from "react";
import icons from "../../lib/remixicon-react";
import ImageUploadComponent from "./ImageUpload";
import { Editor } from "@tiptap/react";
import { Note } from "../../store/types";
import FileUploadComponent from "./FileUpload";

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
  onCloseEditor,
  noteId,
  toggleHeadingTree,
}) => {
  const [wd] = useState<boolean>(
    localStorage.getItem("expand-editor") === "true"
  );

  const handleImageUpload = (imageUrl: string) => {
    editor?.chain().setImage({ src: imageUrl }).run();
  };


  if (!toolbarVisible) return null;

  const handleAddIframe = () => {
    // Prompt the user for the URL
    const videoUrl = prompt("Please enter the URL of the video:");

    // Check if the user canceled or entered an empty URL
    if (!videoUrl || videoUrl.trim() === '') {
      // Prevent adding iframe if URL is empty or canceled
      return;
    }

    let formattedUrl = videoUrl.trim();

    // Check if the URL is a YouTube video URL in the regular format
    if (formattedUrl.includes('youtube.com/watch?v=')) {
      let videoId = formattedUrl.split('v=')[1];
      const ampersandPosition = videoId.indexOf('&');
      if (ampersandPosition !== -1) {
        videoId = videoId.substring(0, ampersandPosition);
      }
      // Convert to the embed format
      formattedUrl = `https://www.youtube.com/embed/${videoId}`;
    } else if (formattedUrl.includes('youtu.be/')) {
      let videoId = formattedUrl.split('youtu.be/')[1];
      const ampersandPosition = videoId.indexOf('?');
      if (ampersandPosition !== -1) {
        videoId = videoId.substring(0, ampersandPosition);
      }
      // Convert to the embed format
      formattedUrl = `https://www.youtube.com/embed/${videoId}`;
    }

    // Use the formatted URL to set the iframe source
    editor?.chain()
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

  return (
    <div
      className={`fixed top-6 left-0 right-0 z-20 bg-[#FFFFFF] dark:bg-[#232222] dark:text-gray-50 overflow-x-auto sm:overflow-x-none py-1 ${
        wd ? "sm:px-10 md:px-10 lg:px-30" : "sm:px-10 md:px-20 lg:px-60"
      }`}
    >
      <div className="w-full h-full flex items-center justify-between bg-[#2D2C2C] rounded-full">
        <button
          className="p-2 hidden sm:block sm:align-start text-white rounded-md bg-transparent cursor-pointer"
          onClick={onCloseEditor}
        >
          <icons.ArrowLeftLineIcon className="border-none text-white text-xl w-7 h-7" />
        </button>
        <div className="sm:mx-auto flex overflow-y-hidden w-fit">
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
        <button
          className={
            editor?.isActive("code")
              ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
              : "p-2 rounded-md text-white bg-transparent cursor-pointer"
          }
          onClick={() => editor?.chain().focus().toggleCode().run()}
        >
          <icons.CodeLineIcon className="border-none text-white text-xl w-7 h-7" />
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
              editor?.isActive("taskList")
                ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
                : "p-2 rounded-md text-white bg-transparent cursor-pointer"
            }
            onClick={() => editor?.chain().focus().toggleTaskList().run()}
          >
            <icons.ListCheck2Icon className="border-none text-white text-xl w-7 h-7" />
          </button>
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
            editor?.isActive("video")
              ? "p-2 rounded-md text-amber-400 bg-[#353333] cursor-pointer"
              : "p-2 rounded-md text-white bg-transparent cursor-pointer"
          }
          onClick={handleAddIframe}
        >
          <icons.VideoIcon className="border-none text-white text-xl w-7 h-7" />
        </button>
          <FileUploadComponent onFileUpload={handlefileUpload} noteId={noteId} />
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
  );
};

export default Toolbar;
