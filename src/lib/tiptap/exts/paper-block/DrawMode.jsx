import React, { useState, useEffect, useRef, useCallback } from "react";
import { getStroke } from "perfect-freehand";
import {
  getSvgPathFromStroke,
  getStrokeOptions,
  convertLegacyLines,
  interpolatePoints,
  convertToLegacyFormat,
  transformPoints,
  getLineBounds,
  isPenInput,
  isPalmTouch,
  getToolSettings,
  preventTouchScroll,
} from "./helpers/drawHelper";
import { useTransformHelpers } from "./helpers/transformHelper";
import { useSelectionHelper } from "./helpers/selectionHelper";
import { recognizeShape, createShape, distance } from "./helpers/shapesHelper";
import { renderHelper } from "./helpers/renderHelper";
import DrawingToolBar from "./DrawingToolbar";
import { usePointerHelper } from "./helpers/pointerHelper";

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

  const { handleTransformStart, handleTransformMove, handleTransformEnd } =
    useTransformHelpers({
      selectedElement,
      svgRef,
      isPalmTouch,
      transformState,
      lines,
      setState,
    });

  const {
    handleSelectionStart,
    handleSelectionMove,
    handleSelectionEnd,
    renderSelectionOverlay,
  } = useSelectionHelper({
    tool,
    svgRef,
    selectedElement,
    selectionBox,
    lines,
    isPalmTouch,
    isPointInsideSelection,
    setState,
    handleTransformStart,
  });

  const {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerLeave,
    handlePointerCancel,
  } = usePointerHelper({
    tool,
    svgRef,
    height,
    selectedElement,
    selectionBox,
    transformState,
    updateAttributes,
    getSettings,
    nextLineId,
    eraserSettings,
    setState,
    handleTransformStart,
    handleTransformMove,
    handleTransformEnd,
    handleSelectionStart,
    handleSelectionMove,
    handleSelectionEnd,
    animationFrameRef,
    currentPointsRef,
    isDrawing,
    isPalmTouch,
    isPenInput,
  });

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

  useEffect(() => {
    const legacyLines = convertToLegacyFormat(lines);
    updateAttributes({
      lines: legacyLines,
      height,

      linesV2: lines,
    });
  }, [lines, height, updateAttributes]);

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
          {renderHelper(
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
