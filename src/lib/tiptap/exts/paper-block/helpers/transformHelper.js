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

      // Reject palm touches or gestures
      if (isPalmTouch(e, svgRef?.current, true)) {
        console.log("Palm touch detected, ignoring transform start");
        return;
      }

      if (
        e.pointerType === "touch" &&
        e.pointerId &&
        svgRef?.current?.contains(e.target)
      ) {
        e.preventDefault();
        e.currentTarget.setPointerCapture?.(e.pointerId);
      }

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
    [selectedElement, isPalmTouch, svgRef, setState]
  );

  const handleTransformMove = useCallback(
    (e) => {
      if (
        !transformState ||
        !selectedElement ||
        isPalmTouch(e, svgRef?.current, false)
      )
        return;

      if (e.pointerType === "touch" && e.pointerId) {
        e.preventDefault();
      }

      const svg = svgRef.current;
      const [currentX, currentY] = getPointerCoordinates(e, svg);
      const dx = currentX - transformState.startX;
      const dy = currentY - transformState.startY;

      if (
        Math.abs(dx) < TRANSFORM_MOVE_THRESHOLD &&
        Math.abs(dy) < TRANSFORM_MOVE_THRESHOLD
      ) {
        return;
      }

      setState((prev) => {
        if (!prev.selectedElement) return prev;

        let newBounds = { ...prev.selectedElement.bounds };

        if (transformState.corner === "move") {
          newBounds.x = transformState.originalBounds.x + dx;
          newBounds.y = transformState.originalBounds.y + dy;
        } else {
          const minSize = 10;

          if (transformState.corner.includes("n")) {
            const newHeight = transformState.originalBounds.height - dy;
            if (newHeight > minSize) {
              newBounds.y = transformState.originalBounds.y + dy;
              newBounds.height = newHeight;
            }
          }
          if (transformState.corner.includes("s")) {
            const newHeight = transformState.originalBounds.height + dy;
            if (newHeight > minSize) {
              newBounds.height = newHeight;
            }
          }
          if (transformState.corner.includes("w")) {
            const newWidth = transformState.originalBounds.width - dx;
            if (newWidth > minSize) {
              newBounds.x = transformState.originalBounds.x + dx;
              newBounds.width = newWidth;
            }
          }
          if (transformState.corner.includes("e")) {
            const newWidth = transformState.originalBounds.width + dx;
            if (newWidth > minSize) {
              newBounds.width = newWidth;
            }
          }
        }

        return {
          ...prev,
          selectedElement: {
            ...prev.selectedElement,
            bounds: newBounds,
          },
        };
      });
    },
    [transformState, selectedElement, isPalmTouch, svgRef, setState]
  );

  const handleTransformEnd = useCallback(
    (e) => {
      if (!transformState || !selectedElement) return;

      if (e?.pointerType === "touch" && e.pointerId) {
        e.preventDefault();
        e.currentTarget?.releasePointerCapture?.(e.pointerId);
      }

      const transformType =
        transformState.corner === "move" ? "move" : "resize";

      const transformedLines = lines.map((line) => {
        if (transformState.lineIds.includes(line.id)) {
          const transformedPoints = transformPoints(
            line.points,
            transformState.originalBounds,
            selectedElement.bounds,
            transformType
          );

          return { ...line, points: transformedPoints };
        }
        return line;
      });

      const transformedSelectedLines = transformedLines.filter((line) =>
        transformState.lineIds.includes(line.id)
      );

      setState((prev) => ({
        ...prev,
        lines: transformedLines,
        undoStack: [...prev.undoStack, prev.lines],
        isDrawing: false,
        selectedElement: {
          type: "group",
          lines: transformedSelectedLines,
          bounds: selectedElement.bounds,
          lineIds: transformState.lineIds,
        },
        transformState: null,
      }));
    },
    [transformState, selectedElement, lines, setState]
  );

  return {
    handleTransformStart,
    handleTransformMove,
    handleTransformEnd,
  };
}
