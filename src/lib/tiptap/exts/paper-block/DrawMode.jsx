import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { getStroke } from "perfect-freehand";
import * as d3 from "d3";
import Icons from "../../../remixicon-react";
import {
  getSvgPathFromStroke,
  getPointerCoordinates,
  getStrokeOptions,
} from "./Draw";
import { renderedPaths, renderSelectionOverlay } from "./Renderer";
import DrawingToolBar from "./DrawingToolbar";

const DrawingComponent = ({ node, updateAttributes, onClose }) => {
  const svgRef = useRef(null);
  const currentPointsRef = useRef([]);
  const [renderKey, setRenderKey] = useState(0);
  const [selectedElement, setSelectedElement] = useState(null);
  const [transformState, setTransformState] = useState(null);

  const convertLegacyLines = (lines) => {
    if (!lines || lines.length === 0) return [];

    return lines.map((line) => {
      if (line.points && Array.isArray(line.points)) {
        return line;
      }

      if (line.path || line.d) {
        const pathString = line.path || line.d;
        const points = extractPointsFromPath(pathString);

        return {
          points: points,
          tool: line.tool || "pen",
          color: line.color || "#000000",
          size: line.size || 2,

          path: pathString,
          d: pathString,
        };
      }

      return {
        points: line.points || [],
        tool: line.tool || "pen",
        color: line.color || "#000000",
        size: line.size || 2,
      };
    });
  };

  const extractPointsFromPath = (pathString) => {
    if (!pathString) return [];

    const points = [];

    const matches = pathString.match(/[-+]?[0-9]*\.?[0-9]+/g);

    if (matches) {
      for (let i = 0; i < matches.length; i += 2) {
        if (matches[i + 1]) {
          points.push([parseFloat(matches[i]), parseFloat(matches[i + 1])]);
        }
      }
    }

    return points;
  };

  const convertToLegacyFormat = (lines) => {
    return lines.map((line) => {
      const legacyLine = {
        tool: line.tool,
        color: line.color,
        size: line.size,
        points: line.points,
      };

      if (line.points && line.points.length > 0) {
        const lineGenerator = d3
          .line()
          .x((d) => d[0])
          .y((d) => d[1])
          .curve(d3.curveBasis);

        legacyLine.path = lineGenerator(line.points);
        legacyLine.d = legacyLine.path;
      }

      return legacyLine;
    });
  };

  const [state, setState] = useState(() => {
    const initialLines = convertLegacyLines(node.attrs.lines || []);

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
    };
  });

  const [selectionBox, setSelectionBox] = useState(null);

  const getLineBounds = (line) => {
    const points = line.points;
    if (!points || points.length === 0)
      return { x: 0, y: 0, width: 0, height: 0 };

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    points.forEach(([x, y]) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  };

  const transformPoints = (
    points,
    originalBounds,
    newBounds,
    transformType
  ) => {
    if (!points || points.length === 0) return points;

    if (transformType === "move") {
      const dx = newBounds.x - originalBounds.x;
      const dy = newBounds.y - originalBounds.y;
      return points.map(([px, py]) => [px + dx, py + dy]);
    }

    const scaleX = newBounds.width / originalBounds.width;
    const scaleY = newBounds.height / originalBounds.height;

    return points.map(([px, py]) => {
      const relativeX = (px - originalBounds.x) / originalBounds.width;
      const relativeY = (py - originalBounds.y) / originalBounds.height;

      return [
        newBounds.x + relativeX * newBounds.width,
        newBounds.y + relativeY * newBounds.height,
      ];
    });
  };

  const isPointInsideSelection = (x, y) => {
    if (!selectedElement) return false;

    const { bounds } = selectedElement;
    return (
      x >= bounds.x &&
      x <= bounds.x + bounds.width &&
      y >= bounds.y &&
      y <= bounds.y + bounds.height
    );
  };

  const handleSelectionStart = (e) => {
    if (state.tool !== "select") return;

    const [x, y] = getPointerCoordinates(e, svgRef);

    setState((prev) => ({
      ...prev,
      isDrawing: true,
    }));

    if (selectedElement && isPointInsideSelection(x, y)) {
      handleTransformStart(e, "move");
      return;
    }

    setSelectionBox({
      startX: x,
      startY: y,
      currentX: x,
      currentY: y,
    });

    setSelectedElement(null);
  };

  const handleSelectionMove = (e) => {
    if (!selectionBox || state.tool !== "select") return;

    const [x, y] = getPointerCoordinates(e, svgRef);
    setSelectionBox((prev) => ({
      ...prev,
      currentX: x,
      currentY: y,
    }));
  };

  const handleSelectionEnd = () => {
    if (!selectionBox || state.tool !== "select") return;

    const bounds = {
      x: Math.min(selectionBox.startX, selectionBox.currentX),
      y: Math.min(selectionBox.startY, selectionBox.currentY),
      width: Math.abs(selectionBox.currentX - selectionBox.startX),
      height: Math.abs(selectionBox.currentY - selectionBox.startY),
    };

    const selectedLines = state.lines.filter((line) => {
      const lineBounds = getLineBounds(line);
      return (
        lineBounds.x < bounds.x + bounds.width &&
        lineBounds.x + lineBounds.width > bounds.x &&
        lineBounds.y < bounds.y + bounds.height &&
        lineBounds.y + lineBounds.height > bounds.y
      );
    });

    if (selectedLines.length > 0) {
      setSelectedElement({
        type: "group",
        lines: selectedLines,
        bounds,
      });
    }

    setSelectionBox(null);

    setState((prev) => ({
      ...prev,
      isDrawing: false,
    }));
  };

  const handleTransformStart = (e, corner) => {
    if (!selectedElement && corner === "move") return;

    const [x, y] = getPointerCoordinates(e, svgRef);
    setTransformState({
      corner,
      startX: x,
      startY: y,
      originalBounds: { ...selectedElement.bounds },
    });

    setState((prev) => ({
      ...prev,
      isDrawing: true,
    }));
  };

  const handleTransformMove = (e) => {
    if (!transformState || !selectedElement) return;

    const [currentX, currentY] = getPointerCoordinates(e, svgRef);
    const dx = currentX - transformState.startX;
    const dy = currentY - transformState.startY;

    setSelectedElement((prev) => {
      if (!prev) return prev;

      let newBounds = { ...prev.bounds };

      if (transformState.corner === "move") {
        newBounds.x = transformState.originalBounds.x + dx;
        newBounds.y = transformState.originalBounds.y + dy;
      } else {
        if (transformState.corner.includes("n")) {
          newBounds.y = transformState.originalBounds.y + dy;
          newBounds.height = transformState.originalBounds.height - dy;
        }
        if (transformState.corner.includes("s")) {
          newBounds.height = transformState.originalBounds.height + dy;
        }
        if (transformState.corner.includes("w")) {
          newBounds.x = transformState.originalBounds.x + dx;
          newBounds.width = transformState.originalBounds.width - dx;
        }
        if (transformState.corner.includes("e")) {
          newBounds.width = transformState.originalBounds.width + dx;
        }
      }

      return {
        ...prev,
        bounds: newBounds,
      };
    });
  };

  const handleTransformEnd = () => {
    if (!transformState || !selectedElement) return;

    const transformType = transformState.corner === "move" ? "move" : "resize";

    const transformedLines = state.lines.map((line) => {
      if (selectedElement.lines.includes(line)) {
        const transformedPoints = transformPoints(
          line.points,
          transformState.originalBounds,
          selectedElement.bounds,
          transformType
        );

        return {
          ...line,
          points: transformedPoints,
        };
      }
      return line;
    });

    setState((prev) => ({
      ...prev,
      lines: transformedLines,
      undoStack: [...prev.undoStack, prev.lines],
      isDrawing: false,
    }));

    const transformedSelectedLines = selectedElement.lines.map((line) => {
      const updatedLine = transformedLines.find(
        (tl) =>
          tl === line ||
          (tl.tool === line.tool &&
            tl.color === line.color &&
            tl.size === line.size)
      );
      return updatedLine || line;
    });

    setSelectedElement({
      type: "group",
      lines: transformedSelectedLines,
      bounds: selectedElement.bounds,
    });

    setTransformState(null);
  };

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
  } = state;

  const preventScrolling = useCallback(
    (event) => {
      if (isDrawing) {
        event.preventDefault();
      }
    },
    [isDrawing]
  );

  useEffect(() => {
    if (isDrawing) {
      window.addEventListener("wheel", preventScrolling, { passive: false });
      window.addEventListener("touchmove", preventScrolling, {
        passive: false,
      });
    } else {
      window.removeEventListener("wheel", preventScrolling);
      window.removeEventListener("touchmove", preventScrolling);
    }
    return () => {
      window.removeEventListener("wheel", preventScrolling);
      window.removeEventListener("touchmove", preventScrolling);
    };
  }, [isDrawing, preventScrolling]);

  useEffect(() => {
    const legacyLines = convertToLegacyFormat(lines);
    updateAttributes({
      lines: legacyLines,
      height,

      linesV2: lines,
    });
  }, [lines, height, updateAttributes]);

  const getSettings = () => {
    return tool === "pen"
      ? penSettings
      : tool === "eraser"
      ? eraserSettings
      : highlighterSettings;
  };

  const handlePointerDown = (e) => {
    if (e.pointerType === "pen" || e.pointerType === "mouse") {
      const svgElem = e.currentTarget;
      svgElem.setPointerCapture(e.pointerId);

      if (state.tool === "select") {
        handleSelectionStart(e);
        return;
      }

      if (selectedElement) {
        setSelectedElement(null);
      }

      const [x, y] = getPointerCoordinates(e, svgRef);

      setState((prev) => ({
        ...prev,
        isDrawing: true,
      }));
      currentPointsRef.current = [[x, y]];

      if (y > height - 50) {
        setState((prev) => {
          const newHeight = prev.height + 100;
          updateAttributes({ height: newHeight });
          return { ...prev, height: newHeight };
        });
      }
    }
  };

  const handlePointerMove = useCallback(
    (e) => {
      if (state.tool === "select") {
        if (transformState) {
          handleTransformMove(e);
        } else if (selectionBox) {
          handleSelectionMove(e);
        }
        return;
      }

      if (
        !isDrawing ||
        !(
          e.pointerType === "pen" ||
          e.pointerType === "mouse" ||
          e.pointerType === "touch"
        )
      )
        return;

      if (e.pointerType === "touch" && e.width > 20 && e.height > 20) {
        return;
      }

      const [x, y] = getPointerCoordinates(e, svgRef);

      currentPointsRef.current = [...currentPointsRef.current, [x, y]];
      setRenderKey((prev) => prev + 1);

      if (y > height - 50) {
        setState((prev) => {
          const newHeight = prev.height + 100;
          updateAttributes({ height: newHeight });
          return { ...prev, height: newHeight };
        });
      }
    },
    [isDrawing, height, state.tool, transformState, selectionBox]
  );

  const handlePointerUp = (e) => {
    if (state.tool === "select") {
      if (transformState) {
        handleTransformEnd();
      } else {
        handleSelectionEnd();
      }
      return;
    }

    if (!isDrawing || currentPointsRef.current.length < 2) {
      setState((prev) => ({
        ...prev,
        isDrawing: false,
      }));
      currentPointsRef.current = [];
      return;
    }

    const settings = getSettings();
    const newLine = {
      points: currentPointsRef.current,
      tool,
      color: settings.color,
      size: settings.size,
    };

    if (tool === "eraser") {
      const eraserStroke = getStroke(
        currentPointsRef.current,
        getStrokeOptions(settings)
      );

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
        };
      });
    } else {
      setState((prev) => ({
        ...prev,
        lines: [...prev.lines, newLine],
        undoStack: [...prev.undoStack, prev.lines],
        redoStack: [],
        isDrawing: false,
      }));
    }

    currentPointsRef.current = [];
  };

  const handlePointerLeave = () => {
    handlePointerUp();
  };

  const undo = () => {
    if (undoStack.length === 0) return;
    const previousLines = undoStack[undoStack.length - 1];
    setState((prev) => ({
      ...prev,
      redoStack: [...prev.redoStack, prev.lines],
      lines: previousLines,
      undoStack: prev.undoStack.slice(0, -1),
    }));

    setSelectedElement(null);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const nextLines = redoStack[redoStack.length - 1];
    setState((prev) => ({
      ...prev,
      undoStack: [...prev.undoStack, prev.lines],
      lines: nextLines,
      redoStack: prev.redoStack.slice(0, -1),
    }));

    setSelectedElement(null);
  };

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
            currentPointsRef.current.length > 1 &&
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
        tool={state.tool}
        setSelectedElement={setSelectedElement}
        onClose={onClose}
        updateAttributes={updateAttributes}
        undo={undo}
        redo={redo}
        undoStack={undoStack}
        redoStack={redoStack}
      />
    </div>
  );
};

export default DrawingComponent;
