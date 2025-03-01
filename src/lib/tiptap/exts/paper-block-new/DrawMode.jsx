import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { getStroke } from "perfect-freehand";
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
  const [state, setState] = useState({
    lines: node.attrs.lines || [],
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
  });

  const [selectionBox, setSelectionBox] = useState(null);

  const getLineBounds = (line) => {
    const points = line.points;
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

  // Modified transformPoints function for proper scaling from center
  const transformPoints = (
    points,
    originalBounds,
    newBounds,
    transformType
  ) => {
    // For move operations, just apply translation
    if (transformType === "move") {
      const dx = newBounds.x - originalBounds.x;
      const dy = newBounds.y - originalBounds.y;
      return points.map(([px, py]) => [px + dx, py + dy]);
    }

    // For resize operations, use the relative position within the original bounds
    // to determine the new position, preserving proportions
    const scaleX = newBounds.width / originalBounds.width;
    const scaleY = newBounds.height / originalBounds.height;

    return points.map(([px, py]) => {
      // Calculate relative position in the original bounds (0-1)
      const relativeX = (px - originalBounds.x) / originalBounds.width;
      const relativeY = (py - originalBounds.y) / originalBounds.height;

      // Apply that relative position to new bounds
      return [
        newBounds.x + relativeX * newBounds.width,
        newBounds.y + relativeY * newBounds.height,
      ];
    });
  };

  // Modified to check if the point is inside any existing selection
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

    // Check if the click is inside the current selection
    if (selectedElement && isPointInsideSelection(x, y)) {
      // Start moving the selection
      handleTransformStart(e, "move");
      return;
    }

    // Otherwise, start a new selection
    setSelectionBox({
      startX: x,
      startY: y,
      currentX: x,
      currentY: y,
    });

    // Clear any existing selection when starting a new one
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

    // Calculate selection bounds
    const bounds = {
      x: Math.min(selectionBox.startX, selectionBox.currentX),
      y: Math.min(selectionBox.startY, selectionBox.currentY),
      width: Math.abs(selectionBox.currentX - selectionBox.startX),
      height: Math.abs(selectionBox.currentY - selectionBox.startY),
    };

    // Find selected lines
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

  // Transform handlers
  const handleTransformStart = (e, corner) => {
    if (!selectedElement && corner === "move") return;

    const [x, y] = getPointerCoordinates(e, svgRef);
    setTransformState({
      corner,
      startX: x,
      startY: y,
      originalBounds: { ...selectedElement.bounds },
    });

    // Set isDrawing to true to prevent scrolling
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
        // Move the entire selection box
        newBounds.x = transformState.originalBounds.x + dx;
        newBounds.y = transformState.originalBounds.y + dy;
      } else {
        // Handle resizing
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
        bounds: newBounds, // Apply new position
      };
    });
  };

  const handleTransformEnd = () => {
    if (!transformState || !selectedElement) return;

    // Determine the type of transformation being performed
    const transformType = transformState.corner === "move" ? "move" : "resize";

    // First, transform the points using our improved transform function
    const transformedLines = state.lines.map((line) => {
      if (selectedElement.lines.includes(line)) {
        return {
          ...line,
          points: transformPoints(
            line.points,
            transformState.originalBounds,
            selectedElement.bounds,
            transformType
          ),
        };
      }
      return line;
    });

    // Then update the state with the transformed lines
    setState((prev) => ({
      ...prev,
      lines: transformedLines,
      undoStack: [...prev.undoStack, prev.lines],
      isDrawing: false, // Set isDrawing back to false
    }));

    // Finally, update selectedElement with the transformed lines
    const transformedSelectedLines = selectedElement.lines.map((line) => {
      const updatedLine = transformedLines.find(
        (tl) =>
          tl.points === line.points ||
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
    updateAttributes({ lines, height });
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

      // If we're in select mode, handle selection and prevent drawing
      if (state.tool === "select") {
        handleSelectionStart(e);
        return;
      }

      // If we're in another tool, and there's a current selection, clear it
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
      // Handle selection/transform moves first
      if (state.tool === "select") {
        if (transformState) {
          handleTransformMove(e);
        } else if (selectionBox) {
          handleSelectionMove(e);
        }
        return;
      }

      // Only proceed with drawing if we're actually drawing
      if (
        !isDrawing ||
        !(
          e.pointerType === "pen" ||
          e.pointerType === "mouse" ||
          e.pointerType === "touch"
        )
      )
        return;

      // Ignore touches with large radius, likely from a palm
      if (e.pointerType === "touch" && e.width > 20 && e.height > 20) {
        return;
      }

      const [x, y] = getPointerCoordinates(e, svgRef);

      // Collect points more frequently
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
    // Handle selection/transform end first
    if (state.tool === "select") {
      if (transformState) {
        handleTransformEnd();
      } else {
        handleSelectionEnd();
      }
      return;
    }

    // Handle drawing end
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
    // Clear selection when undoing
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
    // Clear selection when redoing
    setSelectedElement(null);
  };

  return (
    <div className="draw w-full min-h-screen flex flex-col border-neutral-400 shadow-2xl">
      <div
        className="drawing-container relative w-full rounded-lg "
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
          )}{" "}
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
        />
    </div>
  );
};

export default DrawingComponent;
