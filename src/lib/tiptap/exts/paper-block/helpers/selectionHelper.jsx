// selectionHelper.js
import { useCallback } from "react";
import { getPointerCoordinates, getLineBounds } from "./drawHelper";

export function useSelectionHelper({
  tool,
  svgRef,
  selectedElement,
  selectionBox,
  lines,
  isPalmTouch,
  isPointInsideSelection,
  setState,
  handleTransformStart,
}) {
  const handleSelectionStart = useCallback(
    (e) => {
      // Remove palm touch check for select tool - selection should work with any input
      if (tool !== "select") return;

      const svg = svgRef.current;
      const [x, y] = getPointerCoordinates(e, svg);

      if (selectedElement && isPointInsideSelection(x, y)) {
        handleTransformStart(e, "move");
        return;
      }

      // FIXED: Always clear the current selection when starting a new selection
      // This ensures the selection state is properly reset
      setState((prev) => ({
        ...prev,
        isDrawing: true,
        selectionBox: { startX: x, startY: y, currentX: x, currentY: y },
        selectedElement: null,
        transformState: null, // Also clear any lingering transform state
      }));
    },
    [
      tool,
      selectedElement,
      isPointInsideSelection,
      svgRef,
      handleTransformStart,
      setState,
    ]
  );

  const handleSelectionMove = useCallback(
    (e) => {
      // Remove palm touch check for select tool
      if (!selectionBox || tool !== "select") return;

      const svg = svgRef.current;
      const [x, y] = getPointerCoordinates(e, svg);

      setState((prev) => ({
        ...prev,
        selectionBox: { ...prev.selectionBox, currentX: x, currentY: y },
      }));
    },
    [selectionBox, tool, svgRef, setState]
  );

  const handleSelectionEnd = useCallback(() => {
    if (!selectionBox || tool !== "select") return;

    const bounds = {
      x: Math.min(selectionBox.startX, selectionBox.currentX),
      y: Math.min(selectionBox.startY, selectionBox.currentY),
      width: Math.abs(selectionBox.currentX - selectionBox.startX),
      height: Math.abs(selectionBox.currentY - selectionBox.startY),
    };

    // FIXED: Ensure we're working with the most current lines state
    setState((prev) => {
      // Use the current lines from state to ensure we have the latest data
      const currentLines = prev.lines;

      if (bounds.width > 5 && bounds.height > 5) {
        const selectedLines = currentLines.filter((line) => {
          const lineBounds = getLineBounds(line);
          return (
            lineBounds.x < bounds.x + bounds.width &&
            lineBounds.x + lineBounds.width > bounds.x &&
            lineBounds.y < bounds.y + bounds.height &&
            lineBounds.y + lineBounds.height > bounds.y
          );
        });

        if (selectedLines.length > 0) {
          const actualBounds = selectedLines.reduce(
            (acc, line) => {
              const lineBounds = getLineBounds(line);
              return {
                x: Math.min(acc.x, lineBounds.x),
                y: Math.min(acc.y, lineBounds.y),
                maxX: Math.max(acc.maxX, lineBounds.x + lineBounds.width),
                maxY: Math.max(acc.maxY, lineBounds.y + lineBounds.height),
              };
            },
            { x: Infinity, y: Infinity, maxX: -Infinity, maxY: -Infinity }
          );

          const finalBounds = {
            x: actualBounds.x,
            y: actualBounds.y,
            width: actualBounds.maxX - actualBounds.x,
            height: actualBounds.maxY - actualBounds.y,
          };

          return {
            ...prev,
            selectedElement: {
              type: "group",
              lines: selectedLines,
              bounds: finalBounds,
              lineIds: selectedLines.map((line) => line.id),
            },
            selectionBox: null,
            isDrawing: false,
            transformState: null, // Ensure transform state is cleared
          };
        }
      }

      // If no valid selection, just clear the selection box
      return {
        ...prev,
        selectionBox: null,
        isDrawing: false,
        selectedElement: null,
        transformState: null,
      };
    });
  }, [selectionBox, tool, setState]);

  const renderSelectionOverlay = useCallback(
    (selectedElement, handleTransformStart) => {
      if (!selectedElement || selectedElement.type !== "group") return null;

      const { bounds } = selectedElement;
      const handleRadius = 4;

      return (
        <g>
          <rect
            x={bounds.x}
            y={bounds.y}
            width={bounds.width}
            height={bounds.height}
            className="fill-none stroke-secondary stroke-2"
            style={{ strokeDasharray: "5,5" }}
          />
          {[
            { x: bounds.x, y: bounds.y, cursor: "nw-resize", corner: "nw" },
            {
              x: bounds.x + bounds.width,
              y: bounds.y,
              cursor: "ne-resize",
              corner: "ne",
            },
            {
              x: bounds.x,
              y: bounds.y + bounds.height,
              cursor: "sw-resize",
              corner: "sw",
            },
            {
              x: bounds.x + bounds.width,
              y: bounds.y + bounds.height,
              cursor: "se-resize",
              corner: "se",
            },
          ].map(({ x, y, cursor, corner }) => (
            <circle
              key={corner}
              cx={x}
              cy={y}
              r={handleRadius}
              className="fill-secondary stroke-white stroke-[1px]"
              style={{ cursor }}
              onPointerDown={(e) => {
                e.stopPropagation();
                handleTransformStart(e, corner);
              }}
            />
          ))}
        </g>
      );
    },
    []
  );

  return {
    handleSelectionStart,
    handleSelectionMove,
    handleSelectionEnd,
    renderSelectionOverlay,
  };
}
