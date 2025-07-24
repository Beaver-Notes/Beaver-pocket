import { useCallback } from "react";
import { getPointerCoordinates, transformPoints } from "./drawHelper";

const TRANSFORM_MOVE_THRESHOLD = 2;

export function useTransformHelpers({
  selectedElement,
  svgRef,
  isPalmTouch,
  transformState,
  lines,
  setState,
}) {
  const handleTransformStart = useCallback(
    (e, corner) => {
      if (!selectedElement) return;

      const svg = svgRef.current;
      const [x, y] = getPointerCoordinates(e, svg);

      setState((prev) => ({
        ...prev,
        transformState: {
          corner,
          startX: x,
          startY: y,
          originalBounds: { ...selectedElement.bounds },
          originalLines: [...selectedElement.lines],
          lineIds: [...selectedElement.lineIds],
        },
        isDrawing: true,
      }));
    },
    [selectedElement, svgRef, setState]
  );

  const handleTransformMove = useCallback(
    (e) => {
      if (!transformState || !selectedElement) return;

      const svg = svgRef.current;
      const [currentX, currentY] = getPointerCoordinates(e, svg);

      const dx = currentX - transformState.startX;
      const dy = currentY - transformState.startY;
      const { originalBounds, corner } = transformState;

      let newBounds = { ...originalBounds };

      // Calculate new bounds based on which corner is being dragged
      switch (corner) {
        case "nw":
          newBounds.x = originalBounds.x + dx;
          newBounds.y = originalBounds.y + dy;
          newBounds.width = originalBounds.width - dx;
          newBounds.height = originalBounds.height - dy;
          break;
        case "ne":
          newBounds.y = originalBounds.y + dy;
          newBounds.width = originalBounds.width + dx;
          newBounds.height = originalBounds.height - dy;
          break;
        case "sw":
          newBounds.x = originalBounds.x + dx;
          newBounds.width = originalBounds.width - dx;
          newBounds.height = originalBounds.height + dy;
          break;
        case "se":
          newBounds.width = originalBounds.width + dx;
          newBounds.height = originalBounds.height + dy;
          break;
        case "move":
          newBounds.x = originalBounds.x + dx;
          newBounds.y = originalBounds.y + dy;
          break;
      }

      // Prevent negative dimensions for resize operations
      if (corner !== "move" && (newBounds.width < 10 || newBounds.height < 10))
        return;

      // Calculate scale factors (only for resize, not move)
      let scaleX = 1;
      let scaleY = 1;
      let offsetX = 0;
      let offsetY = 0;

      if (corner !== "move") {
        scaleX = newBounds.width / originalBounds.width;
        scaleY = newBounds.height / originalBounds.height;
        offsetX = newBounds.x - originalBounds.x;
        offsetY = newBounds.y - originalBounds.y;
      } else {
        // For move operation, just translate
        offsetX = dx;
        offsetY = dy;
      }

      // Transform the lines
      const transformedLines = transformState.originalLines.map((line) => {
        const transformedPoints = line.points.map(([px, py]) => {
          if (corner === "move") {
            // Simple translation for move
            return [px + offsetX, py + offsetY];
          } else {
            // Scale and translate for resize
            // Normalize point relative to original bounds
            const normalizedX = (px - originalBounds.x) / originalBounds.width;
            const normalizedY = (py - originalBounds.y) / originalBounds.height;

            // Apply to new bounds
            const newX = newBounds.x + normalizedX * newBounds.width;
            const newY = newBounds.y + normalizedY * newBounds.height;

            return [newX, newY];
          }
        });

        return { ...line, points: transformedPoints };
      });

      // Update both the selected element AND the main lines array in real-time
      setState((prev) => {
        const updatedLines = prev.lines.map((line) => {
          const transformedLine = transformedLines.find(
            (l) => l.id === line.id
          );
          return transformedLine || line;
        });

        return {
          ...prev,
          lines: updatedLines,
          selectedElement: {
            ...selectedElement,
            bounds: newBounds,
            lines: transformedLines,
          },
        };
      });
    },
    [transformState, selectedElement, svgRef, setState]
  );

  const handleTransformEnd = useCallback(() => {
    if (!transformState || !selectedElement) return;

    // FIXED: Keep the selectedElement active after both resize AND move operations
    // This allows for continuous selection interactions without losing the selection
    setState((prev) => ({
      ...prev,
      undoStack: [...prev.undoStack, transformState.originalLines],
      redoStack: [],
      transformState: null,
      // Keep selection active after all transform operations
      isDrawing: false,
    }));
  }, [transformState, selectedElement, setState]);

  return {
    handleTransformStart,
    handleTransformMove,
    handleTransformEnd,
  };
}
