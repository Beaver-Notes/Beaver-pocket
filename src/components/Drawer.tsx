import React, { useState } from "react";

interface DrawerProps {
  defaultHeight: number;
  maxHeight: number;
  children: React.ReactNode;
}

const Drawer: React.FC<DrawerProps> = ({
  defaultHeight,
  maxHeight,
  children,
}) => {
  const [dragStartY, setDragStartY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [drawerHeight, setDrawerHeight] = useState(defaultHeight);

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    setDragStartY(event.touches[0].clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (isDragging) {
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
      {children}
    </div>
  );
};

export default Drawer;
