import React, { useCallback, useState } from "react";
import { Editor } from "@tiptap/react";
import { Note } from "../store/types";

// Icons
import BoldIcon from "remixicon-react/BoldIcon";
import Heading1Icon from "remixicon-react/H1Icon";
import Heading2Icon from "remixicon-react/H2Icon";
import CodeBox from "remixicon-react/CodeBoxLineIcon";
import MarkPenLineIcon from "remixicon-react/MarkPenLineIcon";
import ImageLineIcon from "remixicon-react/ImageLineIcon";
import ListOrderedIcon from "remixicon-react/ListOrderedIcon";
import ItalicIcon from "remixicon-react/ItalicIcon";
import UnderlineIcon from "remixicon-react/UnderlineIcon";
import StrikethroughIcon from "remixicon-react/StrikethroughIcon";
import ListUnorderedIcon from "remixicon-react/ListUnorderedIcon";
import ListCheck2Icon from "remixicon-react/ListCheck2Icon";
import DoubleQuotesLIcon from "remixicon-react/DoubleQuotesLIcon";
import LinkIcon from "remixicon-react/LinkMIcon";
import { Filesystem, FilesystemDirectory } from "@capacitor/filesystem";

interface DrawerProps {
  defaultHeight: number;
  maxHeight: number;
  note: Note;
  editor: Editor | null;
}

const Drawer: React.FC<DrawerProps> = ({
  defaultHeight,
  maxHeight,
  note,
  editor,
}) => {
  const [dragStartY, setDragStartY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [drawerHeight, setDrawerHeight] = useState(defaultHeight);

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    setDragStartY(event.touches[0].clientY);
    setIsDragging(true);
  };

  async function handleImageUpload(file: File, noteId: string) {
    try {
      // Construct the directory path
      const directoryPath = `/assets/${noteId}`;

      // Ensure the directory exists using Capacitor Filesystem
      await Filesystem.mkdir({
        path: directoryPath,
        directory: FilesystemDirectory.Data,
        recursive: true, // Create directories recursively
      });

      const imageFileName = `${directoryPath}/${file.name}`;

      // Read the file as a data URL
      const reader = new FileReader();
      reader.readAsDataURL(file);

      reader.onload = async () => {
        const imageDataUrl = reader.result as string;

        // Save the image using Capacitor Filesystem
        await Filesystem.writeFile({
          path: imageFileName,
          data: imageDataUrl.split(",")[1], // Extract base64 data
          directory: FilesystemDirectory.Data,
        });

        // Construct the image source URL
        const imageSrc = imageDataUrl;

        // Insert the image into the editor
        editor?.chain().focus().setImage({ src: imageSrc }).run();
      };
    } catch (error) {
      console.error("Error uploading image:", error);
    }
  }

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

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (isDragging && editor) {
      // Check if editor exists
      const deltaY = dragStartY - event.touches[0].clientY;
      const newHeight = drawerHeight + deltaY;

      if (newHeight >= defaultHeight && newHeight <= maxHeight) {
        setDrawerHeight(newHeight);
      }
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-[#2D2C2C] rounded-tl-3xl rounded-tr-3xl cursor-grab overflow-hidden transition-height duration-300 ease-in-out"
      style={{ height: `${drawerHeight}px` }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseUp={handleTouchEnd}
    >
      <div className="w-20 h-1 bg-neutral-400 mx-auto mt-4 rounded-2xl"></div>
      <div className="p-2 pt-4 overflow-hidden max-auto flex flex-wrap justify-center">
        <div className="flex flex-wrap">
          <button
            className={
              editor?.isActive("heading", { level: 1 })
                ? "p-[11px] rounded-l-xl text-amber-400 bg-[#424242] cursor-pointer"
                : "p-[11px] rounded-l-xl text-white bg-[#393939] cursor-pointer"
            }
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 1 }).run()
            }
          >
            <Heading1Icon className="border-none text-white text-xl w-7 h-7" />
          </button>
          <button
            className={
              editor?.isActive("heading", { level: 2 })
                ?  "p-[11px] rounded-r-xl text-amber-400 bg-[#424242] cursor-pointer"
                :  "p-[11px] rounded-r-xl text-white bg-[#393939] cursor-pointer"
            }
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            <Heading2Icon className="border-none text-white text-xl w-7 h-7" />
          </button>
        </div>
        <div className="flex pl-1.5">
          <button
            className={
              editor?.isActive("bold")
                ? "p-[11px] rounded-l-xl text-amber-400 bg-[#424242] cursor-pointer"
                : "p-[11px] rounded-l-xl text-white bg-[#393939] cursor-pointer"
            }
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            <BoldIcon className="border-none text-white text-xl w-7 h-7" />
          </button>
          <button
            className={
              editor?.isActive("italic")
                ? "p-[11px] text-amber-400 bg-[#424242] cursor-pointer"
                : "p-[11px] text-white bg-[#393939] cursor-pointer"
            }
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            <ItalicIcon className="border-none text-white text-xl w-7 h-7" />
          </button>
          <button
            className={
              editor?.isActive("underline")
                ? "p-[11px] text-amber-400 bg-[#424242] cursor-pointer"
                : "p-[11px] text-white bg-[#393939] cursor-pointer"
            }
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcon className="border-none text-white text-xl w-7 h-7" />
          </button>
          <button
            className={
              editor?.isActive("strike")
                ? "p-[11px] text-amber-400 bg-[#424242] cursor-pointer"
                : "p-[11px] text-white bg-[#393939] cursor-pointer"
            }
            onClick={() => editor?.chain().focus().toggleStrike().run()}
          >
            <StrikethroughIcon className="border-none text-white text-xl w-7 h-7" />
          </button>
          <button
            className={
              editor?.isActive("highlight")
                ? "p-[11px] rounded-r-xl text-amber-400 bg-[#424242] cursor-pointer"
                : "p-[11px] rounded-r-xl text-white bg-[#393939] cursor-pointer"
            }
            onClick={() => editor?.chain().focus().toggleHighlight().run()}
          >
            <MarkPenLineIcon className="border-none text-white text-xl w-7 h-7" />
          </button>
        </div>
        <div className="flex py-3">
          <button
            onClick={setLink}
            className={
              "p-[11px] rounded-full text-white  bg-[#393939] cursor-pointer"
            }
          >
            <LinkIcon className="border-none text-white text-xl w-7 h-7" />
          </button>
        </div>
        <div className="flex py-3 pl-1.5">
          <div className="p-[11px] rounded-full text-white bg-[#393939] cursor-pointer">
            <label htmlFor="image-upload-input">
              <ImageLineIcon className="border-none text-white text-xl w-7 h-7 cursor-pointer" />
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files) {
                  handleImageUpload(e.target.files[0], note.id);
                }
              }}
              id="image-upload-input"
              className="hidden"
            />
          </div>
        </div>
        <div className="flex py-3 pl-1.5">
          <button
            className={
              editor?.isActive("OrderedList")
                ? "p-[11px] rounded-l-xl text-amber-400 bg-[#424242] cursor-pointer"
                : "p-[11px] rounded-l-xl text-white bg-[#393939] cursor-pointer"
            }
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          >
            <ListOrderedIcon className="border-none text-white text-xl w-7 h-7" />
          </button>
          <button
            className={
              editor?.isActive("UnorderedList")
                ? "p-[11px] text-amber-400 bg-[#424242] cursor-pointer"
                : "p-[11px]text-white bg-[#393939] cursor-pointer"
            }
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          >
            <ListUnorderedIcon className="border-none text-white text-xl w-7 h-7" />
          </button>
          <button
            className={
              editor?.isActive("Tasklist")
                ? "p-[11px] rounded-r-xl text-amber-400 bg-[#424242] cursor-pointer"
                : "p-[11px] rounded-r-xl text-white bg-[#393939] cursor-pointer"
            }
            onClick={() => editor?.chain().focus().toggleTaskList().run}
          >
            <ListCheck2Icon className="border-none text-white text-xl w-7 h-7" />
          </button>
        </div>
        <div className="flex py-3 pl-1.5">
          <button
            className={
              editor?.isActive("Blockquote")
                ? "p-[11px] rounded-full text-amber-400 bg-[#424242] cursor-pointer"
                : "p-[11px] rounded-full text-white bg-[#393939] cursor-pointer"
            }
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          >
            <DoubleQuotesLIcon className="border-none text-white text-xl w-7 h-7" />
          </button>
        </div>
        <div className="flex py-3 pl-1">
          <button
            className={
              editor?.isActive("CodeBlock")
                ? "p-[11px] rounded-full text-amber-400 bg-[#424242] cursor-pointer"
                : "p-[11px] rounded-full text-white bg-[#393939] cursor-pointer"
            }
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
          >
            <CodeBox className="border-none text-white text-xl w-7 h-7" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Drawer;
