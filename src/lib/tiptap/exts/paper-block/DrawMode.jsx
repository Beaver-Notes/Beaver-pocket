import React, { useState, useEffect, useRef, useCallback } from "react";
import { getStroke } from "perfect-freehand";
import {
  getSvgPathFromStroke,
  getPointerCoordinates,
  getStrokeOptions,
  convertLegacyLines,
  interpolatePoints,
  convertToLegacyFormat,
  transformPoints,
  getLineBounds,
} from "./Draw";
import { recognizeShape, createShape, distance } from "./shapeHelper";
import { renderedPaths } from "./Renderer";
import DrawingToolBar from "./DrawingToolbar";

const DrawingComponent = ({ node, updateAttributes, onClose }) => {
  const svgRef = useRef(null);
  const currentPointsRef = useRef([]);
  const animationFrameRef = useRef(null);

  const [state, setState] = useState(() => {
    const initialLines = convertLegacyLines(node.attrs.lines || []).map(
      (line, index) => ({
        ...line,
        id: `line_${index}`,
      })
    );

    return {
      lines: initialLines,
      isDrawing: false,
      tool: "pen",
      penSettings: { color: "#000000", size: 2 },
      eraserSettings: { size: 10 },
      undoStack: [],
      redoStack: [],
      highlighterSettings: { color: "#ff0", size: 8 },
      height: node.attrs.height || 400,
      width: 500,
      background: node.attrs.paperType,
      nextLineId: initialLines.length,
      selectedElement: null,
      transformState: null,
      selectionBox: null,
      currentStrokePoints: [],
    };
  });

  const {
    lines,
    isDrawing,
    tool,
    penSettings,
    eraserSettings,
    undoStack,
    redoStack,
    highlighterSettings,
    height,
    width,
    background,
    nextLineId,
    selectedElement,
    transformState,
    selectionBox,
    currentStrokePoints,
  } = state;

  // Fixed pointer type checks - removed restrictions that were blocking touch/pencil
  const isPenInput = useCallback(
    (e) => e.pointerType === "pen" || e.pointerType === "mouse" || []
  );

  const isPalmTouch = useCallback((e) => e.pointerType === "touch", []);

  const getSettings = useCallback(() => {
    return tool === "pen"
      ? penSettings
      : tool === "eraser"
      ? eraserSettings
      : highlighterSettings;
  }, [tool, penSettings, eraserSettings, highlighterSettings]);

  const isPointInsideSelection = useCallback(
    (x, y) => {
      if (!selectedElement) return false;
      const { bounds } = selectedElement;
      return (
        x >= bounds.x &&
        x <= bounds.x + bounds.width &&
        y >= bounds.y &&
        y <= bounds.y + bounds.height
      );
    },
    [selectedElement]
  );

  const handleSelectionStart = useCallback(
    (e) => {
      if (tool !== "select" || isPalmTouch(e)) return;
      const [x, y] = getPointerCoordinates(e, svgRef);
      if (selectedElement && isPointInsideSelection(x, y)) {
        handleTransformStart(e, "move");
        return;
      }
      setState((prev) => ({
        ...prev,
        isDrawing: true,
        selectionBox: { startX: x, startY: y, currentX: x, currentY: y },
        selectedElement: null,
      }));
    },
    [tool, selectedElement, isPointInsideSelection, isPalmTouch]
  );

  const handleSelectionMove = useCallback(
    (e) => {
      if (!selectionBox || tool !== "select" || isPalmTouch(e)) return;
      const [x, y] = getPointerCoordinates(e, svgRef);
      setState((prev) => ({
        ...prev,
        selectionBox: { ...prev.selectionBox, currentX: x, currentY: y },
      }));
    },
    [selectionBox, tool, isPalmTouch]
  );

  const handleSelectionEnd = useCallback(() => {
    if (!selectionBox || tool !== "select") return;

    const bounds = {
      x: Math.min(selectionBox.startX, selectionBox.currentX),
      y: Math.min(selectionBox.startY, selectionBox.currentY),
      width: Math.abs(selectionBox.currentX - selectionBox.startX),
      height: Math.abs(selectionBox.currentY - selectionBox.startY),
    };

    if (bounds.width > 5 && bounds.height > 5) {
      const selectedLines = lines.filter((line) => {
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

        setState((prev) => ({
          ...prev,
          selectedElement: {
            type: "group",
            lines: selectedLines,
            bounds: finalBounds,
            lineIds: selectedLines.map((line) => line.id),
          },
          selectionBox: null,
          isDrawing: false,
        }));
      }
    } else {
      setState((prev) => ({ ...prev, selectionBox: null, isDrawing: false }));
    }
  }, [selectionBox, tool, lines]);

  const handleTransformStart = useCallback(
    (e, corner) => {
      if (!selectedElement || isPalmTouch(e)) return;
      const [x, y] = getPointerCoordinates(e, svgRef);

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
    [selectedElement, isPalmTouch]
  );

  const TRANSFORM_MOVE_THRESHOLD = 2;

  const handleTransformMove = useCallback(
    (e) => {
      if (!transformState || !selectedElement || isPalmTouch(e)) return;
      const [currentX, currentY] = getPointerCoordinates(e, svgRef);
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
    [transformState, selectedElement, isPalmTouch]
  );

  const handleTransformEnd = useCallback(() => {
    if (!transformState || !selectedElement) return;

    const transformType = transformState.corner === "move" ? "move" : "resize";

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
  }, [transformState, selectedElement, lines]);

  const renderSelectionOverlay = useCallback(
    (selectedElement, handleTransformStart) => {
      if (!selectedElement || selectedElement.type !== "group") return null;

      const { bounds } = selectedElement;
      const handleRadius = 4; // half of 8 for circle radius

      return (
        <g>
          {/* Selection rectangle */}
          <rect
            x={bounds.x}
            y={bounds.y}
            width={bounds.width}
            height={bounds.height}
            className="fill-none stroke-secondary stroke-2"
            style={{ strokeDasharray: "5,5" }}
          />

          {/* Corner resize handles as circles */}
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

  const preventTouchScroll = useCallback((event) => {
    if (event.touches && event.touches.length > 1) {
      return true;
    }
    const svgElement = svgRef.current;
    if (
      svgElement &&
      (event.target === svgElement || svgElement.contains(event.target))
    ) {
      event.preventDefault();
    }
  }, []);

  useEffect(() => {
    const svgElement = svgRef.current;
    if (!svgElement) return;

    const preventAllScrolling = (e) => {
      if (e.touches && e.touches.length > 1) return;
      e.preventDefault();
    };

    svgElement.addEventListener("wheel", preventAllScrolling, {
      passive: false,
    });
    svgElement.addEventListener("touchmove", preventTouchScroll, {
      passive: false,
    });
    svgElement.addEventListener("touchstart", preventAllScrolling, {
      passive: false,
    });

    return () => {
      svgElement.removeEventListener("wheel", preventAllScrolling);
      svgElement.removeEventListener("touchmove", preventTouchScroll);
      svgElement.removeEventListener("touchstart", preventAllScrolling);
    };
  }, [preventTouchScroll]);

  const debouncedUpdateAttributes = useCallback(() => {
    let timeoutId;
    return (attrs) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const legacyLines = convertToLegacyFormat(lines);
        updateAttributes({
          lines: legacyLines,
          height,
          linesV2: lines,
          ...attrs,
        });
      }, 100);
    };
  }, [lines, height, updateAttributes]);

  useEffect(() => {
    debouncedUpdateAttributes()();
  }, [lines, height, debouncedUpdateAttributes]);

  const longPressTimeout = useRef(null);
  const isLongPress = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const MOVE_CANCEL_THRESHOLD = 5; // px
  const LONG_PRESS_DURATION = 500; // ms

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

      const [x, y] = getPointerCoordinates(e, svgRef);
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
          debouncedUpdateAttributes({ height: newHeight });
          return { ...prev, height: newHeight };
        });
      }
    },
    [
      tool,
      selectedElement,
      height,
      handleSelectionStart,
      debouncedUpdateAttributes,
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

      const [x, y] = getPointerCoordinates(e, svgRef);

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
          debouncedUpdateAttributes({ height: newHeight });
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
      debouncedUpdateAttributes,
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
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="draw w-full min-h-screen flex flex-col border-neutral-400 shadow-2xl">
      <div
        className={`drawing-container relative w-full rounded-lg ${
          isDrawing ? "touch-none" : ""
        }`}
        style={{ height: `${height}px` }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          className={`${background} bg-neutral-100 dark:bg-neutral-800 rounded-xl`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          onPointerCancel={handlePointerCancel}
        >
          {renderedPaths(
            lines,
            width,
            height,
            getStroke,
            getStrokeOptions,
            getSvgPathFromStroke
          )}
          {selectionBox && (
            <rect
              x={Math.min(selectionBox.startX, selectionBox.currentX)}
              y={Math.min(selectionBox.startY, selectionBox.currentY)}
              width={Math.abs(selectionBox.currentX - selectionBox.startX)}
              height={Math.abs(selectionBox.currentY - selectionBox.startY)}
              className="fill-secondary opacity-10 stoke-primary"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
          )}
          {renderSelectionOverlay(selectedElement, handleTransformStart)}
          {isDrawing &&
            currentStrokePoints.length > 1 &&
            (() => {
              const settings = getSettings();
              const stroke = getStroke(
                currentPointsRef.current,
                getStrokeOptions(settings)
              );
              const pathData = getSvgPathFromStroke(stroke);

              if (tool === "eraser") {
                const shortStroke = currentPointsRef.current.slice(-5);
                const shortPathData = shortStroke
                  .map((point, index) =>
                    index === 0
                      ? `M ${point[0]},${point[1]}`
                      : `L ${point[0]},${point[1]}`
                  )
                  .join(" ");

                return (
                  <path
                    d={shortPathData}
                    fill="none"
                    stroke="rgba(150, 150, 150, 0.8)"
                    strokeWidth={eraserSettings.size}
                    strokeLinecap="round"
                  />
                );
              }

              return (
                <path
                  d={pathData}
                  fill={settings.color}
                  stroke="none"
                  strokeWidth="0"
                  opacity={tool === "highlighter" ? 0.4 : 1}
                />
              );
            })()}
        </svg>
      </div>

      <DrawingToolBar
        setState={setState}
        state={state}
        tool={tool}
        setSelectedElement={(element) =>
          setState((prev) => ({ ...prev, selectedElement: element }))
        }
        onClose={onClose}
        updateAttributes={updateAttributes}
        undoStack={undoStack}
        redoStack={redoStack}
      />
    </div>
  );
};

export default DrawingComponent;
