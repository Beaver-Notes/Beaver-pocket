import React, { useState, useEffect, useRef } from "react";
import "../../../../assets/css/paper.scss";
import { NodeViewWrapper } from "@tiptap/react";
import Icons from "../../../remixicon-react";
import * as d3 from "d3";
import { v4 as uuid } from "uuid";

const thicknessOptions = {
  thin: 2.5,
  medium: 5,
  thick: 8,
};

const MIN_HEIGHT = 100;
const MAX_HEIGHT = 2000;

const backgroundStyles = {
  none: "",
  grid: "grid",
  ruled: "ruled",
  dotted: "dotted",
};

const CustomNodeView = ({ node, updateAttributes }) => {
  const svgRef = useRef(null);
  const [color, setColor] = useState("#000000");
  const [size, setSize] = useState(thicknessOptions.thin);
  const [drawing, setDrawing] = useState(false);
  const [points, setPoints] = useState([]);
  const [path, setPath] = useState("");
  const [svgHeight, setSvgHeight] = useState(node.attrs.height || 400);
  const [svgWidth] = useState("100%");
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
  const isDarkMode = document.documentElement.classList.contains("dark");

  const linesRef = useRef(node.attrs.lines || []);

  useEffect(() => {
    const svg = d3.select(svgRef.current);

    const eraseRadius = 20; // Defines the size of the eraser's area
    let isErasing = false;

    const handlePointerEvent = (event) => {
      if (event.pointerType === "pen") {
        // Only allow stylus input
        event.preventDefault(); // Prevent Scribble from activating

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

    // Add touchmove listener to prevent Scribble interference
    const preventTouchMove = (event) => event.preventDefault();
    svg
      .on("touchmove", preventTouchMove, { passive: false })
      .on("touchstart", preventTouchMove, { passive: false })
      .on("touchend", preventTouchMove, { passive: false });

    return () => {
      svg.on("pointerdown", null).on("pointermove", null).on("pointerup", null);
      svg.on("touchmove", null).on("touchstart", null).on("touchend", null);
    };
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
    let clientX, clientY;

    if (event.touches && event.touches.length > 0) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    return [clientX - rect.left, clientY - rect.top];
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

  const startResize = (event) => {
    event.preventDefault();
    setIsResizing(true);
    setStartY(event.clientY || (event.touches && event.touches[0].clientY));
  };

  const saveHeight = () => {
    updateAttributes({ height: svgHeight });
  };

  const handleBackgroundChange = (event) => {
    const newBackground = event.target.value;
    setBackground(newBackground);
    updateAttributes({ paperType: newBackground });
  };

  return (
    <NodeViewWrapper className="draw select-none">
      <div className="relative drawing-container">
        <svg
          ref={svgRef}
          height={svgHeight}
          width={svgWidth}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          preserveAspectRatio="xMidYMid meet"
          className={`w-full h-auto border border-gray-300 dark:border-neutral-600 ${background}`}
          style={{ touchAction: "none" }}
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

        <div
          className="absolute bottom-0 w-full h-3 cursor-row-resize bg-neutral-200 dark:bg-neutral-700 border-r border-l border-gray-300 dark:border-neutral-600 dark:border-neutral-600 hover:bg-neutral-300 hover:dark:bg-neutral-600 hover:bg-opacity-60 flex items-center justify-center"
          onMouseDown={startResize}
          onTouchStart={startResize}
        >
          <div className="bg-neutral-400 rounded w-10 h-1"></div>
        </div>
      </div>
      <div className="p-4 flex justify-between items-center bg-gray-100 border border-gray-300 dark:border-neutral-600 rounded-b-xl bg-neutral-100 dark:bg-neutral-800">
        {/* Left side controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setTool("pencil");
              setColor(`${isDarkMode ? "#FFFFFF" : "#000000"}`);
            }}
            onMouseDown={handleMouseDown}
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
            onMouseDown={handleMouseDown}
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
            onMouseDown={handleMouseDown}
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
              className="border border-neutral-300 dark:border-neutral-600 rounded w-full p-2 text-neutral-800 bg-[#F8F8F7] dark:bg-[#2D2C2C] dark:text-[color:var(--selected-dark-text)] outline-none appearance-none mr-6 "
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
            onMouseDown={handleMouseDown}
            className="flex items-center justify-center p-2 border border-gray-300 dark:border-neutral-600 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-neutral-100 dark:bg-neutral-800"
          >
            <Icons.ArrowGoBackLineIcon className="w-6 h-6" />
          </button>
          <button
            onClick={redo}
            onMouseDown={handleMouseDown}
            className="flex items-center justify-center p-2 border border-gray-300 dark:border-neutral-600 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-neutral-100 dark:bg-neutral-800"
          >
            {" "}
            <Icons.ArrowGoForwardLineIcon className="w-6 h-6" />
          </button>
          <button
            onClick={() => setSize(thicknessOptions.thin)}
            className={`flex items-center justify-center p-2 border ${
              size === thicknessOptions.thin
                ? "border-amber-400 bg-amber-100 dark:bg-amber-700"
                : "border-gray-300 dark:border-neutral-600"
            } rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-neutral-100 dark:bg-neutral-800`}
            onMouseDown={handleMouseDown}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={`stroke-current fill-current ${
                isDarkMode ? "text-white fill-white" : "text-black fill-black"
              }`}
            >
              <rect x="2" y="11" width="20" height="2" rx="1" />
            </svg>
          </button>
          <button
            onClick={() => setSize(thicknessOptions.medium)}
            onMouseDown={handleMouseDown}
            className={`flex items-center justify-center p-2 border ${
              size === thicknessOptions.medium
                ? "border-amber-400 bg-amber-100 dark:bg-amber-700"
                : "border-gray-300 dark:border-neutral-600"
            } rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-neutral-100 dark:bg-neutral-800`}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={`stroke-current fill-current ${
                isDarkMode ? "text-white fill-white" : "text-black fill-black"
              }`}
            >
              <rect x="2" y="10" width="20" height="5" rx="2.5" />
            </svg>
          </button>
          <button
            onClick={() => setSize(thicknessOptions.thick)}
            onMouseDown={handleMouseDown}
            className={`flex items-center justify-center p-2 border ${
              size === thicknessOptions.thick
                ? "border-amber-400 bg-amber-100 dark:bg-amber-700"
                : "border-gray-300 dark:border-neutral-600"
            } rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-neutral-100 dark:bg-neutral-800`}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className={`stroke-current fill-current ${
                isDarkMode ? "text-white fill-white" : "text-black fill-black"
              }`}
            >
              <rect x="2" y="8" width="20" height="8" rx="4" />
            </svg>
          </button>
          <div className="relative inline-block">
            {/* Hidden color input */}
            <input
              type="color"
              value={color}
              onChange={handleColorChange}
              ref={colorInputRef}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            {/* Custom button */}
            <button
              onClick={openColorPicker}
              style={{ backgroundColor: color }}
              className="h-8 w-8 rounded-full border-0 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  );
};

export default CustomNodeView;
