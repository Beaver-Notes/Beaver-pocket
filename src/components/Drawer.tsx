import React, { useState } from "react";
import Heading1Icon from "remixicon-react/HeadingIcon";
import { Editor } from "@tiptap/react"; // Import Editor type

interface DrawerProps {
  defaultHeight: number;
  maxHeight: number;
  children: React.ReactNode;
  editor: Editor | null; // Add editor prop
}

const Drawer: React.FC<DrawerProps> = ({
  defaultHeight,
  maxHeight,
  children,
  editor, // Destructure editor prop
}) => {
  const [dragStartY, setDragStartY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [drawerHeight, setDrawerHeight] = useState(defaultHeight);

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    setDragStartY(event.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (isDragging && editor) { // Check if editor exists
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
      {children}
    </div>
  );
};

export default Drawer;
