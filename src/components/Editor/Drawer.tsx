import React, { useEffect, useState } from "react";
import { Editor } from "@tiptap/react";
import { Note } from "../../store/types";
import ImageUploadComponent from "./ImageUpload";
import FileUploadComponent from "./FileUpload";
import icon from "../../lib/remixicon-react";
import { Keyboard } from "@capacitor/keyboard";

interface DrawerProps {
  note: Note;
  noteId: string;
  editor: Editor | null;
}

const Drawer: React.FC<DrawerProps> = ({ editor, noteId }) => {
  const handleImageUpload = (imageUrl: string) => {
    editor?.chain().setImage({ src: imageUrl }).run();
  };

  const handlefileUpload = (fileUrl: string, fileName: string) => {
    if (editor) {
      //@ts-expect-error
      editor.chain().setFileEmbed(fileUrl, fileName).run();
    }
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

  const isTableCellActive = editor?.isActive("tableCell");
  const isTableHeaderActive = editor?.isActive("tableHeader");

  const isTableActive = isTableCellActive || isTableHeaderActive;

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardShowListener = Keyboard.addListener("keyboardDidShow", () => {
      setIsKeyboardVisible(true);
    }) as any;

    const keyboardHideListener = Keyboard.addListener("keyboardDidHide", () => {
      setIsKeyboardVisible(false);
    }) as any;

    return () => {
      keyboardShowListener.remove();
      keyboardHideListener.remove();
    };
  }, []);

  return (
    <div
      className={`sm:hidden block bottom-0 fixed left-0 right-0 ${
        isKeyboardVisible
          ? "bg-[#F8F8F7] dark:bg-[#2D2C2C]"
          : "bg-white dark:bg-[#232222] p-3"
      } cursor-grab overflow-hidden transition-height duration-200 ease-in-out`}
    >
      <div className="overflow-hidden bottom-2 max-auto flex justify-center">
        <div
          className={`flex justify-between w-full px-2 ${
            isTableActive ? "hidden" : "block"
          }`}
        >
          <div className="flex py-1">
            <ImageUploadComponent
              onImageUpload={handleImageUpload}
              noteId={noteId}
            />
          </div>
          <div className="flex py-1 pl-1">
            <button
              className={`p-1 ${
                editor?.isActive("Tasklist") ? "text-amber-400" : ""
              } cursor-pointer`}
              onClick={() => editor?.chain().focus().toggleTaskList().run()}
            >
              <icon.ListCheck2Icon className="border-none text-neutral-700 dark:text-[color:var(--selected-dark-text)] text-xl w-8 h-8 cursor-pointer" />
            </button>
          </div>
          <div className="flex py-1 pl-1">
            <button
              className={`p-1 ${
                editor?.isActive("Tasklist") ? "text-amber-400" : ""
              } cursor-pointer`}
              onClick={() =>
                editor?.commands.insertTable({
                  rows: 3,
                  cols: 3,
                  withHeaderRow: true,
                })
              }
            >
              <icon.Table2Icon className="border-none text-neutral-700 dark:text-[color:var(--selected-dark-text)] text-xl w-8 h-8 cursor-pointer" />
            </button>
          </div>
          <div className="flex py-1 pl-1">
            <button
              className={`p-1 ${
                editor?.isActive("Video") ? "text-amber-400" : ""
              } cursor-pointer`}
              onClick={handleAddIframe}
            >
              <icon.VideoIcon className="border-none text-neutral-700 dark:text-[color:var(--selected-dark-text)] text-xl w-8 h-8 cursor-pointer" />
            </button>
          </div>
          <div className="flex py-1 pl-1">
            <FileUploadComponent
              onFileUpload={handlefileUpload}
              noteId={noteId}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Drawer;
