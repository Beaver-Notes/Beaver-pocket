import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { getStroke } from "perfect-freehand";
import Icons from "../../../remixicon-react";

const average = (a, b) => (a + b) / 2;

function getSvgPathFromStroke(points, closed = true) {
  const len = points.length;

  if (len < 4) {
    return ``;
  }

  let a = points[0];
  let b = points[1];
  const c = points[2];

  let result = `M${a[0].toFixed(2)},${a[1].toFixed(2)} Q${b[0].toFixed(
    2
  )},${b[1].toFixed(2)} ${average(b[0], c[0]).toFixed(2)},${average(
    b[1],
    c[1]
  ).toFixed(2)} T`;

  for (let i = 2, max = len - 1; i < max; i++) {
    a = points[i];
    b = points[i + 1];
    result += `${average(a[0], b[0]).toFixed(2)},${average(a[1], b[1]).toFixed(
      2
    )} `;
  }

  if (closed) {
    result += "Z";
  }

  return result;
}

const DrawingComponent = ({ node, updateAttributes, onClose }) => {
  const svgRef = useRef(null);
  const currentPointsRef = useRef([]);
  const [renderKey, setRenderKey] = useState(0);
  const [activePicker, setActivePicker] = useState(null);
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

  const handleSelectionStart = (e) => {
    if (state.tool !== "select") return;

    const [x, y] = getPointerCoordinates(e);
    setSelectionBox({
      startX: x,
      startY: y,
      currentX: x,
      currentY: y,
    });
  };

  const handleSelectionMove = (e) => {
    if (!selectionBox || state.tool !== "select") return;

    const [x, y] = getPointerCoordinates(e);
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
  };

  // Transform handlers
  const handleTransformStart = (e, corner) => {
    if (!selectedElement) return;

    const [x, y] = getPointerCoordinates(e);
    setTransformState({
      corner,
      startX: x,
      startY: y,
      originalBounds: { ...selectedElement.bounds }, // Ensure we capture latest bounds
    });
  };

  const handleTransformMove = (e) => {
    if (!transformState || !selectedElement) return;

    const [currentX, currentY] = getPointerCoordinates(e);
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

  const getStrokeOptions = (settings) => ({
    size: settings.size,
    thinning: 0.6, // Increase thinning to capture more details
    smoothing: 0.4, // Decrease smoothing for sharper corners
    streamline: 0.5,
    easing: (t) => Math.sin((t * Math.PI) / 2),
    simulatePressure: false, // Enable pressure simulation if supported
    last: true,
    start: {
      cap: true,
      taper: 0,
      easing: (t) => Math.sin((t * Math.PI) / 2),
    },
    end: {
      cap: true,
      taper: 0,
      easing: (t) => Math.sin((t * Math.PI) / 2),
    },
  });

  const getPointerCoordinates = (event) => {
    const svg = svgRef.current;
    const point = svg.createSVGPoint();

    point.x = event.clientX;
    point.y = event.clientY;

    const transformedPoint = point.matrixTransform(
      svg.getScreenCTM().inverse()
    );

    return [transformedPoint.x, transformedPoint.y];
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

      const [x, y] = getPointerCoordinates(e);

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

      const [x, y] = getPointerCoordinates(e);

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
  };

  const handleColorChange = (type, color) => {
    setState((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        color,
      },
    }));
  };

  const renderedPaths = useMemo(() => {
    return lines.map((line, lineIndex) => {
      const stroke = getStroke(line.points, getStrokeOptions(line));
      const pathData = getSvgPathFromStroke(stroke);

      // Render each line in a separate <svg> element
      return (
        <svg
          key={`line-${lineIndex}`}
          viewBox={`0 0 ${width} ${height}`}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            pointerEvents: "none",
          }}
        >
          <path
            d={pathData}
            fill={line.color}
            stroke="none"
            strokeWidth="0"
            opacity={line.tool === "highlighter" ? 0.4 : 1}
          />
        </svg>
      );
    });
  }, [lines]);

  // Modify renderSelectionOverlay to prevent event propagation
  const renderSelectionOverlay = () => {
    if (!selectedElement) return null;

    const { x, y, width, height } = selectedElement.bounds;

    const handleControlPointerDown = (e, corner) => {
      e.stopPropagation(); // Prevent the SVG from receiving the event
      handleTransformStart(e, corner);
    };

    return (
      <g className="selection-overlay" pointerEvents="none">
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill="none"
          stroke="#4099ff"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
        {/* Resize handles */}
        {["nw", "ne", "se", "sw"].map((corner) => (
          <circle
            key={corner}
            cx={x + (corner.includes("e") ? width : 0)}
            cy={y + (corner.includes("s") ? height : 0)}
            r="4"
            fill="white"
            stroke="#4099ff"
            strokeWidth="1"
            pointerEvents="all"
            onPointerDown={(e) => handleControlPointerDown(e, corner)}
            style={{ cursor: "pointer" }}
          />
        ))}
        {/* Move handle */}
        <rect
          x={x + width / 2 - 10}
          y={y - 20}
          width="20"
          height="20"
          fill="white"
          stroke="#4099ff"
          strokeWidth="1"
          pointerEvents="all"
          onPointerDown={(e) => handleControlPointerDown(e, "move")}
          style={{ cursor: "move" }}
        />
      </g>
    );
  };

  return (
    <div
      className="bg-neutral-200 dark:bg-neutral-700 p-5"
      style={{ height: `${height}px` }}
    >
      <div className="draw w-full min-h-screen flex flex-col border-neutral-400 shadow-2xl">
        <div className="fixed top-6 right-0 transform -translate-x-1/2 z-10 p-2 flex justify-between items-center bg-[#2D2C2C] rounded-xl shadow-md">
          <button
            onClick={onClose}
            className="p-1 rounded-full text-[color:var(--selected-dark-text)] transition-colors"
          >
            <Icons.CloseLineIcon className="w-8 h-8" />
          </button>
        </div>

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
            {renderedPaths}
            {selectionBox && (
              <rect
                x={Math.min(selectionBox.startX, selectionBox.currentX)}
                y={Math.min(selectionBox.startY, selectionBox.currentY)}
                width={Math.abs(selectionBox.currentX - selectionBox.startX)}
                height={Math.abs(selectionBox.currentY - selectionBox.startY)}
                fill="rgba(64, 153, 255, 0.1)"
                stroke="#4099ff"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            )}
            {renderSelectionOverlay()}
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

        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-10 flex flex-col items-center gap-2">
          <div className="p-1 flex justify-between items-center bg-[#2D2C2C] rounded-xl shadow-md gap-2">
            <button
              onClick={() => setState((prev) => ({ ...prev, tool: "select" }))}
              className={`flex items-center justify-center p-2 ${
                state.tool === "select"
                  ? "text-secondary"
                  : "text-[color:var(--selected-dark-text)]"
              }`}
            >
              <Icons.Focus3LineIcon className="w-8 h-8" />
            </button>
            <button
              onClick={() => setState((prev) => ({ ...prev, tool: "pen" }))}
              className={`flex items-center justify-center p-2 ${
                tool === "pen"
                  ? "text-secondary"
                  : "text-[color:var(--selected-dark-text)]"
              }`}
            >
              <Icons.BallPenLine className="w-8 h-8" />
            </button>
            <button
              onClick={() =>
                setState((prev) => ({ ...prev, tool: "highlighter" }))
              }
              className={`flex items-center justify-center p-2 ${
                tool === "highlighter"
                  ? "text-secondary"
                  : "text-[color:var(--selected-dark-text)]"
              }`}
            >
              <Icons.MarkPenLineIcon className="w-8 h-8" />
            </button>
            <button
              onClick={() => setState((prev) => ({ ...prev, tool: "eraser" }))}
              className={`flex items-center justify-center p-2 ${
                tool === "eraser"
                  ? "text-secondary"
                  : "text-[color:var(--selected-dark-text)]"
              }`}
            >
              <Icons.EraserLineIcon className="w-8 h-8" />
            </button>
            {tool === "highlighter" && (
              <>
                <div className="relative inline-block">
                  {activePicker === "highlighter" && (
                    <input
                      type="color"
                      value={highlighterSettings.color}
                      onChange={(e) =>
                        handleColorChange("highlighterSettings", e.target.value)
                      }
                      onBlur={() => setActivePicker(null)}
                      autoFocus
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  )}
                  <button
                    onClick={() =>
                      setActivePicker(
                        activePicker === "highlighter" ? null : "highlighter"
                      )
                    }
                    style={{ backgroundColor: highlighterSettings.color }}
                    className="flex items-center justify-center p-1 h-8 w-8 rounded-full hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-neutral-100 dark:bg-neutral-800"
                  />
                </div>
                <label className="flex items-center gap-1">
                  <input
                    type="range"
                    min="10"
                    max="50"
                    value={highlighterSettings.size}
                    onChange={(e) =>
                      setState((prev) => ({
                        ...prev,
                        highlighterSettings: {
                          ...prev.highlighterSettings,
                          size: parseInt(e.target.value),
                        },
                      }))
                    }
                  />
                </label>
              </>
            )}
            {tool === "pen" && (
              <>
                <div className="relative inline-block">
                  {activePicker === "pen" && (
                    <input
                      type="color"
                      value={penSettings.color}
                      onChange={(e) =>
                        handleColorChange("penSettings", e.target.value)
                      }
                      onBlur={() => setActivePicker(null)}
                      autoFocus
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  )}
                  <button
                    onClick={() =>
                      setActivePicker(activePicker === "pen" ? null : "pen")
                    }
                    style={{ backgroundColor: penSettings.color }}
                    className="flex items-center justify-center p-1 h-8 w-8 rounded-full hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-neutral-100 dark:bg-neutral-800"
                  />
                </div>
                <label className="flex items-center gap-1">
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={penSettings.size}
                    onChange={(e) =>
                      setState((prev) => ({
                        ...prev,
                        penSettings: {
                          ...prev.penSettings,
                          size: parseInt(e.target.value),
                        },
                      }))
                    }
                  />
                </label>
              </>
            )}
            {tool === "eraser" && (
              <label className="flex items-center gap-1">
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={eraserSettings.size}
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      eraserSettings: {
                        ...prev.eraserSettings,
                        size: parseInt(e.target.value),
                      },
                    }))
                  }
                />
              </label>
            )}
            <button
              onClick={undo}
              disabled={undoStack.length === 0}
              className="p-2 text-[color:var(--selected-dark-text)]"
            >
              <Icons.ArrowGoBackLineIcon className="w-8 h-8" />
            </button>
            <button
              onClick={redo}
              disabled={redoStack.length === 0}
              className="p-2 text-[color:var(--selected-dark-text)]"
            >
              <Icons.ArrowGoForwardLineIcon className="w-8 h-8" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DrawingComponent;
