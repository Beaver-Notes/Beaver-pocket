import React, { useState, useRef, useEffect } from "react";
import * as d3 from "d3";
import { v4 as uuid } from "uuid";
import { Keyboard } from "@capacitor/keyboard";
import Icons from "../../../remixicon-react";

const thicknessOptions = {
  thin: 1,
  medium: 2,
  thick: 3,
  thicker: 4,
  thickest: 5,
};

const backgroundStyles = {
  none: "",
  grid: "grid",
  ruled: "ruled",
  dotted: "dotted",
};

const BUFFER_ZONE = 50;
const INCREMENT_HEIGHT = 200;
const PREVIEW_HEIGHT = 500;

const DrawMode = ({ onClose, updateAttributes, node }) => {
  const isDarkMode = document.documentElement.classList.contains("dark");
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPath, setDrawingPath] = useState("");
  const [lines, setLines] = useState([]);
  const pointsRef = useRef([]);
  const historyRef = useRef([]);
  const redoStackRef = useRef([]);
  const svgRef = useRef(null);
  const [color, setColor] = useState(isDarkMode ? "#FFFFFF" : "#000000");
  const [size, setSize] = useState(thicknessOptions.thin);
  const [drawing, setDrawing] = useState(false);
  const [points, setPoints] = useState([]);
  const [path, setPath] = useState("");
  const [svgHeight, setSvgHeight] = useState(node.attrs.height || 400);
  const [svgWidth] = useState(500);
  const [tool, setTool] = useState("pencil");
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [isResizing, setIsResizing] = useState(false);
  const [startY, setStartY] = useState(0);
  const [id] = useState(() => node.attrs.id || uuid());
  const colorInputRef = useRef(null);
  const [background, setBackground] = useState(
    node.attrs.paperType || backgroundStyles.none
  );

  const linesRef = useRef(node.attrs.lines || []);

  const handleBackgroundChange = (event) => {
    const newBackground = event.target.value;
    setBackground(newBackground);
    updateAttributes({ paperType: newBackground });
  };

  useEffect(() => {
    const svg = d3.select(svgRef.current);

    const eraseRadius = 5; // Defines the size of the eraser's area
    let isErasing = false;

    const handlePointerEvent = (event) => {
      // Only process single-touch for drawing and erasing
      if (event.pointerType === "pen") {
        // For two-finger gestures, allow scrolling and exit drawing mode
        if (event.touches && event.touches.length > 1) {
          setDrawing(false); // Stop drawing if two fingers are detected
          return;
        }

        const [x, y] = getPointerCoordinates(event);

        if (event.type === "pointerdown") {
          if (tool === "erase") {
            isErasing = true;
            eraseOverlappingPaths(x, y); // Start erasing immediately
          } else {
            startDrawing(x, y);
          }
        } else if (event.type === "pointermove") {
          if (tool === "erase" && isErasing) {
            eraseOverlappingPaths(x, y); // Continuously erase during movement
          } else if (tool !== "erase") {
            draw(x, y);
          }
        } else if (event.type === "pointerup") {
          if (tool === "erase") {
            isErasing = false; // Stop erasing after pointer is lifted
          } else {
            stopDrawing();
          }
        }
      }
    };

    const eraseOverlappingPaths = (x, y) => {
      const eraserArea = {
        x: x - eraseRadius,
        y: y - eraseRadius,
        width: eraseRadius * 2,
        height: eraseRadius * 2,
      };

      svg.selectAll("path").each(function () {
        const path = d3.select(this);
        const pathNode = path.node();
        const pathBBox = pathNode.getBBox(); // Get the bounding box of the path

        // Check if the path overlaps the eraser area
        if (
          pathBBox.x < eraserArea.x + eraserArea.width &&
          pathBBox.x + pathBBox.width > eraserArea.x &&
          pathBBox.y < eraserArea.y + eraserArea.height &&
          pathBBox.y + pathBBox.height > eraserArea.y
        ) {
          deletePath(pathNode); // Delete the path if it intersects with the eraser area
        }
      });
    };

    // Use pointer events for unified handling of mouse, touch, and pen input
    svg
      .on("pointerdown", handlePointerEvent)
      .on("pointermove", handlePointerEvent)
      .on("pointerup", handlePointerEvent);

    // Prevent Scribble interference during touchmove
    const preventTouchMove = (event) => {
      if (event.touches.length === 1) {
        event.preventDefault(); // Prevent default only for single-touch to allow scrolling with two fingers
      }
    };

    svg
      .on("touchmove", preventTouchMove, { passive: false })
      .on("touchstart", preventTouchMove, { passive: false })
      .on("touchend", preventTouchMove, { passive: false });
  }, [tool, color, size, points]);

  const deletePath = (pathElement) => {
    const clickedPathData = pathElement.getAttribute("d");
    const pathIndex = linesRef.current.findIndex(
      (line) => line.path === clickedPathData
    );

    if (pathIndex !== -1) {
      const removedLine = linesRef.current[pathIndex];

      // Save the deletion action
      setHistory((prevHistory) => [
        ...prevHistory,
        { action: "delete", line: removedLine },
      ]);

      linesRef.current.splice(pathIndex, 1);
      updateAttributes({
        lines: linesRef.current,
      });
    }
  };

  const handleMouseDown = (event) => {
    event.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (event) => {
      if (isResizing) {
        const currentY =
          event.clientY || (event.touches && event.touches[0].clientY);
        const deltaY = currentY - startY;
        setSvgHeight((prevHeight) => {
          const newHeight = Math.max(
            MIN_HEIGHT,
            Math.min(MAX_HEIGHT, prevHeight + deltaY)
          );
          return newHeight;
        });
        setStartY(currentY);
      }
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.removeEventListener("touchmove", handleMouseMove);
        document.removeEventListener("touchend", handleMouseUp);
        saveHeight();
      }
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchmove", handleMouseMove);
      document.addEventListener("touchend", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleMouseMove);
      document.removeEventListener("touchend", handleMouseUp);
    };
  }, [isResizing, startY]);

  const getPointerCoordinates = (event) => {
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();

    // Get the correct pointer position, including page scroll and scale
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;

    // Calculate the mouse position relative to the SVG
    const scaleX = svg.viewBox.baseVal.width / rect.width;
    const scaleY = svg.viewBox.baseVal.height / rect.height;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    return [x, y];
  };

  const startDrawing = (x, y) => {
    setDrawing(true);
    setPoints([{ x, y }]);
  };

  const draw = (x, y) => {
    if (!drawing) return;

    const newPoints = [...points, { x, y }];
    setPoints(newPoints);

    const lineGenerator = d3
      .line()
      .x((d) => d.x)
      .y((d) => d.y)
      .curve(d3.curveBasis);

    const newPath = lineGenerator(newPoints);
    setPath(newPath);
    if (y > svgHeight - BUFFER_ZONE) {
      const newHeight = svgHeight + INCREMENT_HEIGHT;
      setSvgHeight(newHeight);
      updateAttributes({ height: newHeight });

      // Adjust scroll position to keep the drawing point in view
      const container = containerRef.current;
      if (container) {
        const scrollContainer = container.closest(".drawing-component");
        if (scrollContainer) {
          scrollContainer.scrollTo({
            top: scrollContainer.scrollHeight,
            behavior: "smooth",
          });
        }
      }
    }
  };

  const stopDrawing = () => {
    if (drawing) {
      setDrawing(false);
      saveDrawing();
      setHistory((prevHistory) => [
        ...prevHistory,
        { id, path, color, size, tool },
      ]);
      setPath("");
      setPoints([]);
    }
  };

  const handleColorChange = (e) => {
    setColor(e.target.value);
  };

  const openColorPicker = () => {
    colorInputRef.current.click();
  };

  const saveDrawing = () => {
    const newLine = { id: uuid(), path, color, size, tool };
    linesRef.current = [...linesRef.current, newLine];

    // Save the action as adding this specific line, not the entire drawing
    setHistory((prevHistory) => [
      ...prevHistory,
      { action: "add", line: newLine },
    ]);

    // Clear the redo stack since a new action was taken
    setRedoStack([]);

    updateAttributes({
      lines: linesRef.current,
      id: id,
    });
  };

  // Store only actions in history (add or delete)
  const undo = () => {
    if (history.length > 0) {
      const lastAction = history[history.length - 1];
      setHistory((prevHistory) => prevHistory.slice(0, -1));
      setRedoStack((prevStack) => [...prevStack, lastAction]);

      if (lastAction.action === "add") {
        // Undo adding a line by removing it
        linesRef.current = linesRef.current.filter(
          (line) => line.id !== lastAction.line.id
        );
      } else if (lastAction.action === "delete") {
        // Undo deleting a line by adding it back
        linesRef.current = [...linesRef.current, lastAction.line];
      }

      updateAttributes({
        lines: linesRef.current,
      });
    }
  };

  const redo = () => {
    if (redoStack.length > 0) {
      const lastRedo = redoStack[redoStack.length - 1];
      setRedoStack((prevStack) => prevStack.slice(0, -1));
      setHistory((prevHistory) => [...prevHistory, lastRedo]);

      if (lastRedo.action === "add") {
        // Redo adding a line by adding it back
        linesRef.current = [...linesRef.current, lastRedo.line];
      } else if (lastRedo.action === "delete") {
        // Redo deleting a line by removing it again
        linesRef.current = linesRef.current.filter(
          (line) => line.id !== lastRedo.line.id
        );
      }

      updateAttributes({
        lines: linesRef.current,
      });
    }
  };

  const saveHeight = () => {
    updateAttributes({ height: svgHeight });
  };

  useEffect(() => {
    const showListener = Keyboard.addListener("keyboardWillShow", () => {
      Keyboard.hide();
    });

    return () => {
      showListener.remove();
    };
  }, []);

  return (
    <div className="draw w-full min-h-screen flex flex-col">
      <div className="relative flex-grow drawing-container">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          preserveAspectRatio="xMidYMid meet"
          className={`w-full h-auto border border-gray-300 dark:border-neutral-600 ${background}`}
        >
          {linesRef.current.map((item) => (
            <path
              key={`${item.id}-${item.color}-${item.size}-${Date.now()}`}
              d={item.path}
              stroke={
                isDarkMode
                  ? item.color === "#000000"
                    ? "#FFFFFF"
                    : item.color
                  : item.color
              }
              strokeWidth={item.size}
              opacity={item.tool === "highlighter" ? 0.3 : 1}
              fill="none"
            />
          ))}
          {path && (
            <path
              d={path}
              stroke={color}
              strokeWidth={size}
              opacity={tool === "highlighter" ? 0.3 : 1}
              fill="none"
            />
          )}
        </svg>
      </div>

      {/* Toolbar */}
      <div className="sticky top-4 rounded-full mx-4 p-4 flex justify-between items-center bg-gray-100 dark:bg-neutral-800">
        {/* Left side controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setTool("pencil");
              setColor("#000000");
            }}
            onMouseDown={(e) => e.preventDefault()}
            className={`flex items-center justify-center p-2 border ${
              tool === "pencil"
                ? "border-amber-400 bg-amber-100 dark:bg-amber-700"
                : "border-gray-300 dark:border-neutral-600"
            } rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-neutral-100 dark:bg-neutral-800`}
          >
            <Icons.BallPenLine className="w-6 h-6" />
          </button>
          <button
            onClick={() => {
              setTool("highlighter");
              setColor("#FFFF00");
            }}
            onMouseDown={(e) => e.preventDefault()}
            className={`flex items-center justify-center p-2 border ${
              tool === "highlighter"
                ? "border-amber-400 bg-amber-100 dark:bg-amber-700"
                : "border-gray-300 dark:border-neutral-600"
            } rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-neutral-100 dark:bg-neutral-800`}
          >
            <Icons.MarkPenLineIcon className="w-6 h-6" />
          </button>
          <button
            onClick={() => setTool("erase")}
            onMouseDown={(e) => e.preventDefault()}
            className={`flex items-center justify-center p-2 border ${
              tool === "erase"
                ? "border-amber-400 bg-amber-100 dark:bg-amber-700"
                : "border-gray-300 dark:border-neutral-600"
            } rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-neutral-100 dark:bg-neutral-800`}
          >
            <Icons.EraserLineIcon className="w-6 h-6" />
          </button>
          <div className="relative">
            <select
              className="border border-neutral-300 dark:border-neutral-600 rounded w-full p-2 text-neutral-800 bg-[#F8F8F7] dark:bg-[#2D2C2C] dark:text-[color:var(--selected-dark-text)] outline-none appearance-none mr-6"
              value={background}
              onChange={handleBackgroundChange}
            >
              <option value="none">None</option>
              <option value="grid">Grid</option>
              <option value="ruled">Ruled</option>
              <option value="dotted">Dotted</option>
            </select>
            <Icons.ArrowDownSLineIcon className="dark:text-[color:var(--selected-dark-text)] ri-arrow-down-s-line absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-600 pointer-events-none" />
          </div>
        </div>
        {/* Right side controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={undo}
            onMouseDown={(e) => e.preventDefault()}
            className="flex items-center justify-center p-2 border border-gray-300 dark:border-neutral-600 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-neutral-100 dark:bg-neutral-800"
          >
            <Icons.ArrowGoBackLineIcon className="w-6 h-6" />
          </button>
          <button
            onClick={redo}
            onMouseDown={(e) => e.preventDefault()}
            className="flex items-center justify-center p-2 border border-gray-300 dark:border-neutral-600 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-neutral-100 dark:bg-neutral-800"
          >
            <Icons.ArrowGoForwardLineIcon className="w-6 h-6" />
          </button>
          <button
            onClick={() => setSize(thicknessOptions.thin)}
            onMouseDown={(e) => e.preventDefault()}
            className={`flex items-center justify-center p-1 border ${
              size === thicknessOptions.thin
                ? "border-amber-400 bg-amber-100 dark:bg-amber-700 w-10 h-10"
                : "border-gray-300 dark:border-neutral-600 h-10 w-10"
            } rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-neutral-100 dark:bg-neutral-800`}
          >
            <svg
              width="15"
              height="2"
              className="rounded"
              style={{ backgroundColor: color }}
            />
          </button>
          <button
            onClick={() => setSize(thicknessOptions.medium)}
            onMouseDown={(e) => e.preventDefault()}
            className={`flex items-center justify-center p-1 border ${
              size === thicknessOptions.medium
                ? "border-amber-400 bg-amber-100 dark:bg-amber-700 w-10 h-10"
                : "border-gray-300 dark:border-neutral-600 h-10 w-10"
            } rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-neutral-100 dark:bg-neutral-800`}
          >
            <svg
              width="15"
              height="3"
              className="rounded"
              style={{ backgroundColor: color }}
            />
          </button>
          <button
            onClick={() => setSize(thicknessOptions.thick)}
            onMouseDown={(e) => e.preventDefault()}
            className={`flex items-center justify-center p-1 border ${
              size === thicknessOptions.thick
                ? "border-amber-400 bg-amber-100 dark:bg-amber-700 w-10 h-10"
                : "border-gray-300 dark:border-neutral-600 h-10 w-10"
            } rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-neutral-100 dark:bg-neutral-800`}
          >
            <svg
              width="15"
              height="4"
              className="rounded"
              style={{ backgroundColor: color }}
            />
          </button>
          <button
            onClick={() => setSize(thicknessOptions.thicker)}
            onMouseDown={(e) => e.preventDefault()}
            className={`flex items-center justify-center p-1 border ${
              size === thicknessOptions.thicker
                ? "border-amber-400 bg-amber-100 dark:bg-amber-700 w-10 h-10"
                : "border-gray-300 dark:border-neutral-600 h-10 w-10"
            } rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-neutral-100 dark:bg-neutral-800`}
          >
            <svg
              width="15"
              height="5"
              className="rounded"
              style={{ backgroundColor: color }}
            />
          </button>
          <button
            onClick={() => setSize(thicknessOptions.thickest)}
            onMouseDown={(e) => e.preventDefault()}
            className={`flex items-center justify-center p-1 border ${
              size === thicknessOptions.thickest
                ? "border-amber-400 bg-amber-100 dark:bg-amber-700 w-10 h-10"
                : "border-gray-300 dark:border-neutral-600 h-10 w-10"
            } rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-neutral-100 dark:bg-neutral-800`}
          >
            <svg
              width="15"
              height="6"
              className="rounded"
              style={{ backgroundColor: color }}
            />
          </button>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="border-0 rounded-full p-1 cursor-pointer"
          />
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors"
          >
            <Icons.CloseLineIcon className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DrawMode;
