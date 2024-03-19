import React, { useState, useEffect } from "react";
import { Editor, BubbleMenu } from "@tiptap/react";
import InsertRowTopIcon from "remixicon-react/InsertRowTopIcon";
import DeleteRow from "remixicon-react/DeleteRowIcon";
import DeleteColumn from "remixicon-react/DeleteColumnIcon";
import InsertRowBottomIcon from "remixicon-react/InsertRowBottomIcon";
import InsertColumnLeftIcon from "remixicon-react/InsertColumnLeftIcon";
import InsertColumnRightIcon from "remixicon-react/InsertColumnRightIcon";
import Brush2Fill from "remixicon-react/Brush2FillIcon";

interface Props {
  editor: Editor | null;
}

const BubbleMenuTable: React.FC<Props> = ({ editor }) => {
  const [menuOpen, setMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleMenuState = () => {
      const isTableCellActive = editor?.isActive("tableCell");
      const isTableHeaderActive = editor?.isActive("tableHeader");
      setMenuOpen(!!(isTableCellActive || isTableHeaderActive));
    };

    handleMenuState(); // Initial call to set menu state

    editor?.on("transaction", handleMenuState);

    return () => {
      editor?.off("transaction", handleMenuState);
    };
  }, [editor]);

  return (
    <>
      {editor && (
        <BubbleMenu
          editor={editor}
          shouldShow={() => true}
          tippyOptions={{ duration: 100 }}
        >
          <div className={menuOpen ? "block" : "hidden"}>
            <div className="bg-[#2D2C2C] p-1 rounded-lg max-w-xs">
          <button
            className={
              editor?.isActive("heading", { level: 1 })
                ? "p-1 text-amber-400 cursor-pointer"
                : "p-1 bg-transparent cursor-pointer"
            }
            onClick={() => editor?.chain().focus().addRowAfter().run()}
          >
            <InsertRowBottomIcon
              className={
                editor?.isActive("heading", { level: 1 })
                  ? "p-1 border-none text-amber-300 text-xl w-9 h-9"
                  : "p-1 border-none text-white text-xl w-9 h-9"
              }
            />
          </button>
          <button
            className={
              editor?.isActive("heading", { level: 1 })
                ? "p-1 text-amber-400 cursor-pointer"
                : "p-1 bg-transparent cursor-pointer"
            }
            onClick={() => editor?.chain().focus().addRowBefore().run()}
          >
            <InsertRowTopIcon
              className={
                editor?.isActive("heading", { level: 1 })
                  ? "p-1 border-none text-amber-300 text-xl w-9 h-9"
                  : "p-1 border-none text-white text-xl w-9 h-9"
              }
            />
          </button>
          <button
            className={
              editor?.isActive("heading", { level: 1 })
                ? "p-1 text-amber-400 cursor-pointer"
                : "p-1 bg-transparent cursor-pointer"
            }
            onClick={() => editor?.chain().focus().deleteRow().run()}
          >
            <DeleteRow
              className={
                editor?.isActive("heading", { level: 1 })
                  ? "p-1 border-none text-amber-300 text-xl w-9 h-9"
                  : "p-1 border-none text-white text-xl w-9 h-9"
              }
            />
          </button>
          <button
            className={
              editor?.isActive("heading", { level: 1 })
                ? "p-1 text-amber-400 cursor-pointer"
                : "p-1 bg-transparent cursor-pointer"
            }
            onClick={() => editor?.chain().focus().addColumnBefore().run()}
          >
            <InsertColumnLeftIcon
              className={
                editor?.isActive("heading", { level: 1 })
                  ? "p-1 border-none text-amber-300 text-xl w-9 h-9"
                  : "p-1 border-none text-white text-xl w-9 h-9"
              }
            />
          </button>
          <button
            className={
              editor?.isActive("heading", { level: 1 })
                ? "p-1 text-amber-400 cursor-pointer"
                : "p-1 bg-transparent cursor-pointer"
            }
            onClick={() => editor?.chain().focus().addColumnAfter().run()}
          >
            <InsertColumnRightIcon
              className={
                editor?.isActive("heading", { level: 1 })
                  ? "p-1 border-none text-amber-300 text-xl w-9 h-9"
                  : "p-1 border-none text-white text-xl w-9 h-9"
              }
            />
          </button>
          <button
            className={
              editor?.isActive("heading", { level: 1 })
                ? "p-1 text-amber-400 cursor-pointer"
                : "p-1 bg-transparent cursor-pointer"
            }
            onClick={() => editor?.chain().focus().deleteColumn().run()}
          >
            <DeleteColumn
              className={
                editor?.isActive("heading", { level: 1 })
                  ? "p-1 border-none text-amber-300 text-xl w-9 h-9"
                  : "p-1 border-none text-white text-xl w-9 h-9"
              }
            />
          </button>
          <button
            className={
              editor?.isActive("heading", { level: 1 })
                ? "p-1 text-amber-400 cursor-pointer"
                : "p-1 bg-transparent cursor-pointer"
            }
            onClick={() => editor?.chain().focus().toggleHeaderCell().run()}
          >
            <Brush2Fill
              className={
                editor?.isActive("heading", { level: 1 })
                  ? "p-1 border-none text-amber-300 text-xl w-9 h-9"
                  : "p-1 border-none text-white text-xl w-9 h-9"
              }
            />
          </button>
          </div>
          </div>
        </BubbleMenu>
      )}
    </>
  );
};

export default BubbleMenuTable;
