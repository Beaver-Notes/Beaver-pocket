import React from "react";

interface FloatingMenuProps {
  editor: any;
  slashPopupPosition: { top: number; left: number } | any;
  slashPosition: number | null; // To track the slash position
  setSlashPopupPosition: React.Dispatch<React.SetStateAction<any>>; // To close popup after selection
  setSlashPosition: React.Dispatch<React.SetStateAction<number | null>>; // To reset slashPosition
}

const FloatingMenuComponent: React.FC<FloatingMenuProps> = ({
  editor,
  slashPopupPosition,
  slashPosition,
  setSlashPopupPosition,
  setSlashPosition,
}) => {
  if (!editor || slashPosition === null) {
    return null;
  }

  // Function to delete the "/" after a button is clicked
  const handleAction = (action: () => void) => {
    // Get current text in the editor
    const text = editor.getText(); // Use Tiptap's method to get the current text

    // Check if the slash is present and delete it
    if (slashPosition !== null && text[slashPosition] === '/') {
      // Create a new content by removing the slash
      const newContent = text.slice(0, slashPosition) + text.slice(slashPosition + 1);
      // Update the editor's content
      editor.commands.setContent(newContent);
    }

    // Execute the editor command
    action(); 

    // Close the popup
    setSlashPopupPosition(null); // Close the popup
    setSlashPosition(null); // Reset slashPosition
  };

  return (
    <div
      className="z-50 fixed bg-white dark:bg-[#232222] shadow border-2 dark:border-neutral-600 rounded-lg min-w-24 p-2"
      style={{ top: slashPopupPosition.top, left: slashPopupPosition.left }}
    >
      <div className="max-h-40 overflow-y-auto flex flex-col space-y-2 no-scrollbar">
        <p>Basic Blocks</p>
        <button
          onClick={() => handleAction(() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          )}
          className={`p-2 rounded hover:bg-gray-100 transition ${
            editor.isActive("heading", { level: 1 })
              ? "bg-gray-200 text-blue-500"
              : "text-gray-700"
          }`}
        >
          H1
        </button>
        <button
          onClick={() => handleAction(() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          )}
          className={`p-2 rounded hover:bg-gray-100 transition ${
            editor.isActive("heading", { level: 2 })
              ? "bg-gray-200 text-blue-500"
              : "text-gray-700"
          }`}
        >
          H2
        </button>
        <button
          onClick={() => handleAction(() =>
            editor.chain().focus().toggleBulletList().run()
          )}
          className={`p-2 rounded hover:bg-gray-100 transition ${
            editor.isActive("bulletList")
              ? "bg-gray-200 text-blue-500"
              : "text-gray-700"
          }`}
        >
          • List
        </button>
        <button
          onClick={() => handleAction(() =>
            editor.chain().focus().toggleOrderedList().run()
          )}
          className={`p-2 rounded hover:bg-gray-100 transition ${
            editor.isActive("orderedList")
              ? "bg-gray-200 text-blue-500"
              : "text-gray-700"
          }`}
        >
          1. Ordered List
        </button>
        <button
          onClick={() => handleAction(() =>
            editor.chain().focus().toggleBlockquote().run()
          )}
          className={`p-2 rounded hover:bg-gray-100 transition ${
            editor.isActive("blockquote")
              ? "bg-gray-200 text-blue-500"
              : "text-gray-700"
          }`}
        >
          Blockquote
        </button>
        <p>Media</p>
      </div>
    </div>
  );
};

export default FloatingMenuComponent;
