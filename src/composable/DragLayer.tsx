import { useEffect, useState } from "react";

export const useDragLayer = () => {
  const [dragState, setDragState] = useState({
    isDragging: false,
    item: null,
    itemType: null,
    currentOffset: null,
    initialOffset: null,
  });

  useEffect(() => {
    let rafId: number;

    const handleDragStart = () => {
      const updateDragState = () => {
        // This would typically use react-dnd's useDragLayer hook
        // For now, we'll track mouse position manually
        setDragState((prev) => ({ ...prev, isDragging: true }));
      };
      rafId = requestAnimationFrame(updateDragState);
    };

    const handleDragEnd = () => {
      setDragState((prev) => ({ ...prev, isDragging: false, item: null }));
    };

    document.addEventListener("dragstart", handleDragStart);
    document.addEventListener("dragend", handleDragEnd);

    return () => {
      document.removeEventListener("dragstart", handleDragStart);
      document.removeEventListener("dragend", handleDragEnd);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  return dragState;
};
