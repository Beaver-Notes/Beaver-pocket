import React from "react";
import { Editor } from "@tiptap/react";
import { Note } from "../../store/types";
import ImageUploadComponent from "./ImageUpload";

// Icons
import CodeBox from "remixicon-react/CodeBoxLineIcon";
import ListCheck2Icon from "remixicon-react/ListCheck2Icon";
import Table2Icon from "remixicon-react/Table2Icon";
import File2LineIcon from "remixicon-react/File2LineIcon";

interface DrawerProps {
  note: Note;
  isVisible: boolean;
  noteId: string;
  editor: Editor | null;
}

const Drawer: React.FC<DrawerProps> = ({ editor, noteId, isVisible }) => {
  const handleImageUpload = (imageUrl: string) => {
    editor?.chain().setImage({ src: imageUrl }).run();
  };

  return (
    <div
      className={`sm:hidden block fixed bottom-0 left-0 right-0 ${
        isVisible ? "bg-[#F8F8F7] dark:bg-[#2D2C2C]" : "bg-white dark:bg-[#232222]"
      } cursor-grab overflow-hidden transition-height duration-200 ease-in-out`}
    >
      <div className="overflow-hidden max-auto flex justify-center">
        <div className="flex justify-between w-full px-2">
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
              <ListCheck2Icon className="border-none text-neutral-700 dark:text-white text-xl w-8 h-8 cursor-pointer" />
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
              <Table2Icon className="border-none text-neutral-700 dark:text-white text-xl w-8 h-8 cursor-pointer" />
            </button>
          </div>
          <div className="flex py-1 pl-1">
            <button
              className={`p-1 ${
                editor?.isActive("Tasklist") ? "text-amber-400" : ""
              } cursor-pointer`}
              onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
            >
              <CodeBox className="border-none text-neutral-700 dark:text-white text-xl w-8 h-8 cursor-pointer" />
            </button>
          </div>
          <div className="flex py-1 pl-1">
            <button
              className={`p-1 ${
                editor?.isActive("embedded-file") ? "text-amber-400" : ""
              } cursor-pointer`}
              onClick={() => alert("not implemented yet")}
            >
              <File2LineIcon className="border-none text-neutral-700 dark:text-white text-xl w-8 h-8 cursor-pointer" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Drawer;
