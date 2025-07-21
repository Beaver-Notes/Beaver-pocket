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
  const activePointers = useRef(new Set());
  const primaryPointerId = useRef(null);
  const isMultiTouch = useRef(false);
  const touchStartTime = useRef(null);
  const drawingCancelled = useRef(false);

  const LONG_PRESS_DURATION = 500;
  const MOVE_CANCEL_THRESHOLD = 5;
  const MULTI_TOUCH_CANCEL_DELAY = 100;

  const handleTouchStart = useCallback(
    (e) => {
      const touchCount = e.touches.length;

      if (touchCount === 1) {
        touchStartTime.current = Date.now();
        isMultiTouch.current = false;
        drawingCancelled.current = false;
      } else if (touchCount === 2) {
        // Two fingers detected - this is likely a scroll gesture
        isMultiTouch.current = true;

        // If we were drawing, cancel it
        if (isDrawing && !drawingCancelled.current) {
          drawingCancelled.current = true;
          console.log("Multi-touch detected, cancelling drawing");

          // Cancel any ongoing drawing
          setState((prev) => ({
            ...prev,
            isDrawing: false,
            currentStrokePoints: [],
          }));
          currentPointsRef.current = [];

          if (longPressTimeout.current) {
            clearTimeout(longPressTimeout.current);
            longPressTimeout.current = null;
          }

          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
          }
        }

        // Don't prevent default for two-finger gestures - allow native scrolling
        return;
      }

      // Only prevent default for single touches on the drawing area
      if (touchCount === 1 && svgRef?.current?.contains(e.target)) {
        e.preventDefault();
      }
    },
    [isDrawing, setState, svgRef]
  );

  const handleTouchMove = useCallback(
    (e) => {
      const touchCount = e.touches.length;

      if (touchCount >= 2) {
        isMultiTouch.current = true;
        // Don't prevent default for multi-touch - allow native scroll behavior
        return;
      }

      // Only prevent single-touch moves on the drawing area
      if (
        touchCount === 1 &&
        svgRef?.current?.contains(e.target) &&
        !isMultiTouch.current
      ) {
        e.preventDefault();
      }
    },
    [svgRef]
  );

  const handleTouchEnd = useCallback((e) => {
    const touchCount = e.touches.length;

    // Reset multi-touch state when all fingers are lifted
    if (touchCount === 0) {
      setTimeout(() => {
        isMultiTouch.current = false;
        drawingCancelled.current = false;
      }, 50); // Small delay to prevent immediate re-triggering
    }
  }, []);

  const handlePointerDown = useCallback(
    (e) => {
      // Track all pointers
      activePointers.current.add(e.pointerId);

      // If this is a touch and we're in multi-touch mode, ignore
      if (e.pointerType === "touch" && isMultiTouch.current) {
        console.log("Multi-touch mode active, ignoring pointer down");
        return;
      }

      // If we already have multiple pointers, ignore additional ones
      if (activePointers.current.size > 1) {
        console.log("Multiple pointers detected, ignoring additional pointer");
        // For touch events, check if this might be the start of a scroll gesture
        if (e.pointerType === "touch") {
          isMultiTouch.current = true;
          // Cancel any ongoing drawing
          if (isDrawing) {
            drawingCancelled.current = true;
            setState((prev) => ({
              ...prev,
              isDrawing: false,
              currentStrokePoints: [],
            }));
            currentPointsRef.current = [];
          }
        }
        return;
      }

      // Check if this is a palm touch or invalid input
      if (isPalmTouch(e, svgRef?.current, false) || !isPenInput(e)) {
        console.log("Palm touch or invalid input detected, ignoring");
        activePointers.current.delete(e.pointerId);
        return;
      }

      // Set this as the primary pointer
      primaryPointerId.current = e.pointerId;

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
      drawingCancelled.current = false;

      if (longPressTimeout.current) {
        clearTimeout(longPressTimeout.current);
        longPressTimeout.current = null;
      }

      // Only start long press timer if not eraser
      if (tool !== "eraser") {
        longPressTimeout.current = setTimeout(() => {
          if (!drawingCancelled.current && !isMultiTouch.current) {
            isLongPress.current = true;
            longPressTimeout.current = null;
            console.log("Long press triggered");
          }
        }, LONG_PRESS_DURATION);
      }

      setState((prev) => ({
        ...prev,
        isDrawing: true,
        currentStrokePoints: [[x, y]],
      }));

      // Initialize currentPointsRef
      currentPointsRef.current = [[x, y]];

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
      svgRef,
      isDrawing,
    ]
  );

  const handlePointerMove = useCallback(
    (e) => {
      // Only process events from the primary pointer
      if (e.pointerId !== primaryPointerId.current) return;

      // If we're in multi-touch mode or drawing was cancelled, ignore moves
      if (isMultiTouch.current || drawingCancelled.current) return;

      // If multiple pointers active, ignore moves
      if (activePointers.current.size > 1) {
        // Mark as multi-touch for touch events
        if (e.pointerType === "touch") {
          isMultiTouch.current = true;
          if (isDrawing && !drawingCancelled.current) {
            drawingCancelled.current = true;
            setState((prev) => ({
              ...prev,
              isDrawing: false,
              currentStrokePoints: [],
            }));
            currentPointsRef.current = [];
          }
        }
        return;
      }

      // Check for palm touch
      if (isPalmTouch(e, svgRef?.current, true)) {
        console.log("Palm touch detected during move, canceling");
        handlePointerCancel(e);
        return;
      }

      if (!isPenInput(e)) return;

      if (tool === "select") {
        if (transformState) {
          handleTransformMove(e);
        } else if (selectionBox) {
          handleSelectionMove(e);
        }
        return;
      }

      if (!isDrawing || drawingCancelled.current) return;

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
          !isLongPress.current &&
          !drawingCancelled.current &&
          !isMultiTouch.current
        ) {
          longPressTimeout.current = setTimeout(() => {
            if (!drawingCancelled.current && !isMultiTouch.current) {
              isLongPress.current = true;
              longPressTimeout.current = null;
              console.log("Long press triggered after stopping movement");
            }
          }, LONG_PRESS_DURATION);
          startPos.current = { x, y };
        }
      }

      currentPointsRef.current.push([x, y]);

      if (!animationFrameRef.current && !drawingCancelled.current) {
        animationFrameRef.current = requestAnimationFrame(() => {
          if (!drawingCancelled.current) {
            const interpolated = interpolatePoints(currentPointsRef.current, {
              smoothness: 0.7,
            });
            setState((prev) => ({
              ...prev,
              currentStrokePoints: interpolated,
            }));
          }
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
      svgRef,
    ]
  );

  const handlePointerUp = useCallback(
    (e) => {
      // Remove pointer from active set
      activePointers.current.delete(e.pointerId);

      // Only process up events from the primary pointer
      if (e.pointerId !== primaryPointerId.current) return;

      // Reset primary pointer if this was it
      if (e.pointerId === primaryPointerId.current) {
        primaryPointerId.current = null;
      }

      // Don't process palm touches
      if (isPalmTouch(e, svgRef?.current, true)) return;

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

      // If drawing was cancelled due to multi-touch, don't create a line
      if (drawingCancelled.current || isMultiTouch.current) {
        setState((prev) => ({
          ...prev,
          isDrawing: false,
          currentStrokePoints: [],
        }));
        currentPointsRef.current = [];
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
      svgRef,
    ]
  );

  const handlePointerLeave = useCallback(
    (e) => {
      // Remove from active pointers
      activePointers.current.delete(e.pointerId);

      if (isPalmTouch(e, svgRef?.current)) return;
      if (e.pointerId !== primaryPointerId.current) return;

      e.preventDefault();
      handlePointerUp(e);
    },
    [handlePointerUp, isPalmTouch, svgRef]
  );

  const handlePointerCancel = useCallback(
    (e) => {
      // Remove from active pointers
      activePointers.current.delete(e.pointerId);

      // Reset primary pointer if this was it
      if (e.pointerId === primaryPointerId.current) {
        primaryPointerId.current = null;
      }

      if (isPalmTouch(e, svgRef?.current)) return;

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
      drawingCancelled.current = true;
    },
    [isPalmTouch, svgRef]
  );

  // Set up touch event listeners for the SVG element
  useEffect(() => {
    const svgElement = svgRef.current;
    if (!svgElement) return;

    // Add passive touch listeners to detect multi-touch gestures
    svgElement.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });
    svgElement.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    svgElement.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      if (svgElement) {
        svgElement.removeEventListener("touchstart", handleTouchStart);
        svgElement.removeEventListener("touchmove", handleTouchMove);
        svgElement.removeEventListener("touchend", handleTouchEnd);
      }
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, svgRef]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (longPressTimeout.current) {
        clearTimeout(longPressTimeout.current);
      }
      activePointers.current.clear();
      primaryPointerId.current = null;
      isMultiTouch.current = false;
      drawingCancelled.current = false;
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
