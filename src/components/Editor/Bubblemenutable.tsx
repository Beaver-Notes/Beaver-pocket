import React, { useState, useEffect } from "react";
import { Editor, BubbleMenu } from "@tiptap/react";
import icons from "../../lib/remixicon-react";

interface Props {
  editor: Editor | null;
  isTyping: boolean;
}

const BubbleMenuTable: React.FC<Props> = ({ editor, isTyping }) => {
  const [menuOpen, setMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    const handleMenuState = () => {
      if (isTyping) {
        setMenuOpen(false);
        return;
      }
      
      const isTableCellActive = editor?.isActive("tableCell");
      const isTableHeaderActive = editor?.isActive("tableHeader");
      setMenuOpen(!!(isTableCellActive || isTableHeaderActive));
    };

    handleMenuState(); // Initial call to set menu state

    editor?.on("transaction", handleMenuState);

    return () => {
      editor?.off("transaction", handleMenuState);
    };
  }, [editor, isTyping]);

  return (
    <>
      {editor && (
        <BubbleMenu
          editor={editor}
          shouldShow={() => menuOpen}
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
                <icons.InsertRowBottomIcon
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
                <icons.InsertRowTopIcon
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
                <icons.DeleteRow
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
                <icons.InsertColumnLeftIcon
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
                <icons.InsertColumnRightIcon
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
                <icons.DeleteColumn
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
                <icons.Brush2Fill
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
