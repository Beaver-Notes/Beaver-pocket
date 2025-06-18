// usePointerHelper.js
import { useRef, useCallback, useEffect } from "react";
import { getStroke } from "perfect-freehand";
import {
  getPointerCoordinates,
  interpolatePoints,
  getStrokeOptions,
} from "./drawHelper";
import { createShape, recognizeShape } from "./shapesHelper";

export function usePointerHelper({
  tool,
  selectedElement,
  height,
  transformState,
  selectionBox,
  svgRef,
  animationFrameRef,
  currentPointsRef,
  setState,
  handleSelectionStart,
  handleSelectionMove,
  handleSelectionEnd,
  handleTransformMove,
  handleTransformEnd,
  updateAttributes,
  isPalmTouch,
  isPenInput,
  getSettings,
  nextLineId,
  eraserSettings,
  isDrawing,
}) {
  const longPressTimeout = useRef(null);
  const isLongPress = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const LONG_PRESS_DURATION = 500;
  const MOVE_CANCEL_THRESHOLD = 5;

  const handlePointerDown = useCallback(
    (e) => {
      if (isPalmTouch(e) || !isPenInput(e)) return;

      e.preventDefault();
      const svgElem = e.currentTarget;
      svgElem.setPointerCapture(e.pointerId);

      if (tool === "select") {
        handleSelectionStart(e);
        return;
      }

      if (selectedElement) {
        setState((prev) => ({ ...prev, selectedElement: null }));
      }

      const svg = svgRef.current;
      const [x, y] = getPointerCoordinates(e, svg);
      startPos.current = { x, y };
      isLongPress.current = false;

      if (longPressTimeout.current) {
        clearTimeout(longPressTimeout.current);
        longPressTimeout.current = null;
      }

      // Only start long press timer if not eraser
      if (tool !== "eraser") {
        longPressTimeout.current = setTimeout(() => {
          isLongPress.current = true;
          longPressTimeout.current = null;
          console.log("Long press triggered");
        }, LONG_PRESS_DURATION);
      }

      setState((prev) => ({
        ...prev,
        isDrawing: true,
        currentStrokePoints: [[x, y]],
      }));

      if (y > height - 50) {
        setState((prev) => {
          const newHeight = prev.height + 100;
          updateAttributes({ height: newHeight });
          return { ...prev, height: newHeight };
        });
      }
    },
    [
      tool,
      selectedElement,
      height,
      handleSelectionStart,
      updateAttributes,
      isPalmTouch,
      isPenInput,
    ]
  );

  const handlePointerMove = useCallback(
    (e) => {
      if (isPalmTouch(e) || !isPenInput(e)) return;

      if (tool === "select") {
        if (transformState) {
          handleTransformMove(e);
        } else if (selectionBox) {
          handleSelectionMove(e);
        }
        return;
      }

      if (!isDrawing) return;

      const svg = svgRef.current;
      const [x, y] = getPointerCoordinates(e, svg);

      const dx = x - startPos.current.x;
      const dy = y - startPos.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > MOVE_CANCEL_THRESHOLD) {
        // User moved — cancel long press timer (only if not eraser)
        if (tool !== "eraser" && longPressTimeout.current) {
          clearTimeout(longPressTimeout.current);
          longPressTimeout.current = null;
          isLongPress.current = false;
          console.log("Long press cancelled due to move");
        }
        startPos.current = { x, y };
      } else {
        if (
          tool !== "eraser" &&
          !longPressTimeout.current &&
          !isLongPress.current
        ) {
          longPressTimeout.current = setTimeout(() => {
            isLongPress.current = true;
            longPressTimeout.current = null;
            console.log("Long press triggered after stopping movement");
          }, LONG_PRESS_DURATION);
          startPos.current = { x, y };
        }
      }

      currentPointsRef.current.push([x, y]);

      if (!animationFrameRef.current) {
        animationFrameRef.current = requestAnimationFrame(() => {
          const interpolated = interpolatePoints(currentPointsRef.current, {
            smoothness: 0.7, // same smoothness as doodle
          });
          setState((prev) => ({ ...prev, currentStrokePoints: interpolated }));
          animationFrameRef.current = null;
        });
      }

      if (y > height - 50) {
        setState((prev) => {
          const newHeight = prev.height + 100;
          updateAttributes({ height: newHeight });
          return { ...prev, height: newHeight };
        });
      }
    },
    [
      isDrawing,
      height,
      tool,
      transformState,
      selectionBox,
      isPalmTouch,
      isPenInput,
      updateAttributes,
      handleTransformMove,
      handleSelectionMove,
    ]
  );

  const handlePointerUp = useCallback(
    (e) => {
      if (isPalmTouch(e)) return;

      e.preventDefault();

      if (longPressTimeout.current) {
        clearTimeout(longPressTimeout.current);
        longPressTimeout.current = null;
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      if (tool === "select") {
        if (transformState) {
          handleTransformEnd();
        } else {
          handleSelectionEnd();
        }
        return;
      }

      // No long press behavior for eraser
      if (isLongPress.current && tool !== "eraser") {
        const points = currentPointsRef.current;
        isLongPress.current = false;

        if (points.length < 2) {
          setState((prev) => ({
            ...prev,
            isDrawing: false,
            currentStrokePoints: [],
          }));
          currentPointsRef.current = [];
          return;
        }

        const shape = recognizeShape(points);

        const newShape = createShape(
          shape,
          points,
          tool,
          nextLineId,
          getSettings
        );

        if (newShape) {
          setState((prev) => ({
            ...prev,
            lines: [...prev.lines, newShape],
            undoStack: [...prev.undoStack, prev.lines],
            redoStack: [],
            isDrawing: false,
            nextLineId: prev.nextLineId + 1,
            currentStrokePoints: [],
          }));
        } else {
          setState((prev) => ({
            ...prev,
            isDrawing: false,
            currentStrokePoints: [],
          }));
        }

        currentPointsRef.current = [];
        return;
      }

      if (!isDrawing || currentPointsRef.current.length < 2) {
        setState((prev) => ({
          ...prev,
          isDrawing: false,
          currentStrokePoints: [],
        }));
        currentPointsRef.current = [];
        return;
      }

      const settings = getSettings();
      const finalPoints = interpolatePoints(currentPointsRef.current, {
        smoothness: 0.7,
      });

      const newLine = {
        id: `line_${nextLineId}`,
        points: finalPoints,
        tool,
        color: settings.color,
        size: settings.size,
      };

      if (tool === "eraser") {
        const eraserStroke = getStroke(finalPoints, getStrokeOptions(settings));

        setState((prev) => {
          const newLines = prev.lines.filter((line) => {
            if (!line.points || line.points.length === 0) return true;

            const lineStroke = getStroke(line.points, getStrokeOptions(line));
            return !lineStroke.some(([lx, ly]) =>
              eraserStroke.some(
                ([ex, ey]) => Math.hypot(lx - ex, ly - ey) < eraserSettings.size
              )
            );
          });

          return {
            ...prev,
            lines: newLines,
            undoStack: [...prev.undoStack, prev.lines],
            redoStack: [],
            isDrawing: false,
            currentStrokePoints: [],
          };
        });
      } else {
        setState((prev) => ({
          ...prev,
          lines: [...prev.lines, newLine],
          undoStack: [...prev.undoStack, prev.lines],
          redoStack: [],
          isDrawing: false,
          nextLineId: prev.nextLineId + 1,
          currentStrokePoints: [],
        }));
      }

      currentPointsRef.current = [];
    },
    [
      tool,
      transformState,
      handleTransformEnd,
      handleSelectionEnd,
      isDrawing,
      getSettings,
      nextLineId,
      eraserSettings.size,
      isPalmTouch,
    ]
  );

  const handlePointerLeave = useCallback(
    (e) => {
      if (isPalmTouch(e)) return;
      e.preventDefault();
      handlePointerUp(e);
    },
    [handlePointerUp, isPalmTouch]
  );

  const handlePointerCancel = useCallback(
    (e) => {
      if (isPalmTouch(e)) return;
      e.preventDefault();
      if (longPressTimeout.current) {
        clearTimeout(longPressTimeout.current);
        longPressTimeout.current = null;
      }
      setState((prev) => ({
        ...prev,
        isDrawing: false,
        currentStrokePoints: [],
      }));
      currentPointsRef.current = [];
    },
    [isPalmTouch]
  );

  useEffect(() => {
    return () => {
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerLeave,
    handlePointerCancel,
  };
}
