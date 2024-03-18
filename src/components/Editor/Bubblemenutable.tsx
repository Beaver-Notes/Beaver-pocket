import React, { useState, useEffect } from "react";
import { Editor, BubbleMenu } from "@tiptap/react";

//icons
import InsertRowTopIcon from "remixicon-react/InsertRowTopIcon";
import InsertRowBottomIcon from "remixicon-react/InsertRowBottomIcon";
import DeleteRow from "remixicon-react/DeleteRowIcon";
import InsertColumnLeftIcon from "remixicon-react/InsertColumnLeftIcon";
import InsertColumnRightIcon from "remixicon-react/InsertColumnRightIcon";
import DeleteColumn from "remixicon-react/DeleteColumnIcon";
import Brush2Fill from "remixicon-react/Brush2LineIcon";

interface Props {
  editor: Editor | null;
}

const BlubblemenuTable: React.FC<Props> = ({ editor }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!editor) return;

    const isTableCellActive = editor.isActive("tableCell");
    const isTableHeaderActive = editor.isActive("tableHeader");
    setMenuOpen(isTableCellActive || isTableHeaderActive);
  }, [editor]);

  return (
    <>
      {editor && (
        <BubbleMenu
          editor={editor}
          shouldShow={() => true}
          tippyOptions={{ duration: 100 }}
          className="bg-[#2D2C2C] p-1 rounded-lg max-w-xs"
        >
          <div style={{ display: menuOpen ? "block" : "none" }}>
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
        </BubbleMenu>
      )}
    </>
  );
};

export default BlubblemenuTable;
