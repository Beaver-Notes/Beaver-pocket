import React, { useRef, useEffect } from "react";
import { Keyboard } from "@capacitor/keyboard";
import Icons from "../../../remixicon-react";
import { useDrawing, thicknessOptions, backgroundStyles } from "./useDrawing";

const DrawMode = ({ onClose, updateAttributes, node }) => {
  const colorInputRef = useRef(null);

  const {
    drawing,
    path,
    svgHeight,
    tool,
    color,
    size,
    background,
    svgRef,
    linesRef,
    pathsGroupRef,
    activePathRef,
    setTool,
    setColor,
    setSize,
    setBackground,
    startDrawing,
    draw,
    stopDrawing,
    undo,
    redo,
    deletePath,
    getPointerCoordinates,
    adjustColorForMode,
  } = useDrawing({
    initialHeight: node.attrs.height || 400,
    initialLines: node.attrs.lines || [],
    onUpdateAttributes: updateAttributes,
  });

  const svgWidth = 500;
  const isDarkMode = document.documentElement.classList.contains("dark");

  useEffect(() => {
    const showListener = Keyboard.addListener("keyboardWillShow", () => {
      Keyboard.hide();
    });

    return () => {
      showListener.remove();
    };
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return; // Exit if ref is not set

    const eraseRadius = 5;
    let isErasing = false;
    let penActive = false;
    let penTimeout = null;

    const PEN_TIMEOUT_DURATION = 700;

    const handlePointerEvent = (event) => {
      if (event.pointerType === "pen") {
        penActive = true;
        clearTimeout(penTimeout);
        event.preventDefault();
        event.stopPropagation();

        const [x, y] = getPointerCoordinates(event);

        if (event.type === "pointerdown") {
          if (tool === "erase") {
            isErasing = true;
            eraseOverlappingPaths(x, y);
          } else {
            startDrawing(x, y);
          }
        } else if (event.type === "pointermove") {
          if (tool === "erase" && isErasing) {
            eraseOverlappingPaths(x, y);
          } else if (tool !== "erase") {
            draw(x, y);
          }
        } else if (event.type === "pointerup") {
          if (tool === "erase") {
            isErasing = false;
          } else {
            stopDrawing();
          }

          penTimeout = setTimeout(() => {
            penActive = false;
          }, PEN_TIMEOUT_DURATION);
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

      svg.querySelectorAll("path").forEach((pathNode) => {
        const pathBBox = pathNode.getBBox();

        if (
          pathBBox.x < eraserArea.x + eraserArea.width &&
          pathBBox.x + pathBBox.width > eraserArea.x &&
          pathBBox.y < eraserArea.y + eraserArea.height &&
          pathBBox.y + pathBBox.height > eraserArea.y
        ) {
          deletePath(pathNode);
        }
      });
    };

    const preventScrolling = (event) => {
      if (penActive) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    svg.addEventListener("pointerdown", handlePointerEvent);
    svg.addEventListener("pointermove", handlePointerEvent);
    svg.addEventListener("pointerup", handlePointerEvent);
    document.body.addEventListener("touchstart", preventScrolling, {
      passive: false,
    });
    document.body.addEventListener("touchmove", preventScrolling, {
      passive: false,
    });
    document.body.addEventListener("touchend", preventScrolling, {
      passive: false,
    });

    return () => {
      clearTimeout(penTimeout);
      svg.removeEventListener("pointerdown", handlePointerEvent);
      svg.removeEventListener("pointermove", handlePointerEvent);
      svg.removeEventListener("pointerup", handlePointerEvent);
      document.body.removeEventListener("touchstart", preventScrolling);
      document.body.removeEventListener("touchmove", preventScrolling);
      document.body.removeEventListener("touchend", preventScrolling);
    };
  }, [
    tool,
    deletePath,
    draw,
    startDrawing,
    stopDrawing,
    getPointerCoordinates,
  ]);

  const handleBackgroundChange = (event) => {
    const newBackground = event.target.value;
    setBackground(newBackground);
    updateAttributes({ paperType: newBackground });
  };

  const handleColorChange = (e) => {
    setColor(e.target.value);
  };

  const openColorPicker = () => {
    colorInputRef.current.click();
  };

  const chunkedLines = React.useMemo(() => {
    const chunkSize = 100;
    const chunks = [];
    for (let i = 0; i < linesRef.current.length; i += chunkSize) {
      chunks.push(linesRef.current.slice(i, i + chunkSize));
    }
    return chunks;
  }, [linesRef.current.length]);

  const renderPaths = () =>
    chunkedLines.map((chunk, chunkIndex) => (
      <g key={`chunk-${chunkIndex}`}>
        {chunk.map((item) => (
          <path
            key={`${item.id}-${item.color}-${item.size}`}
            d={item.path}
            stroke={adjustColorForMode(item.color)}
            strokeWidth={item.size}
            opacity={item.tool === "highlighter" ? 0.3 : 1}
            fill="none"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
    ));

  // Rest of your JSX remains the same, just update the references to use the hook's values and methods
  return (
    <div className="draw w-full min-h-screen flex flex-col">
      {/* Top Toolbar */}
      <div className="mt-2 sticky top-0 z-10 p-4 flex justify-between items-center bg-gray-100 dark:bg-neutral-800 rounded-none shadow-md">
        {/* Left side controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setTool("pencil");
              setColor(isDarkMode ? "#FFFFFF" : "#000000");
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
              width="3"
              height="3"
              className="rounded-full"
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
              width="4"
              height="4"
              className="rounded-full"
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
              width="5"
              height="5"
              className="rounded-full"
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
              width="6"
              height="6"
              className="rounded-full"
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
              width="7"
              height="7"
              className="rounded-full"
              style={{ backgroundColor: color }}
            />
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
              className={`flex items-center justify-center p-1 h-10 w-10 rounded-full hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-neutral-100 dark:bg-neutral-800`}
            />
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors"
          >
            <Icons.CloseLineIcon className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* SVG Container */}
      <div className="relative flex-grow drawing-container">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          preserveAspectRatio="xMidYMid meet"
          className={`w-full h-auto ${background} bg-neutral-100 dark:bg-neutral-800`}
        >
          <g ref={pathsGroupRef}>{renderPaths()}</g>
          {path && (
            <path
              ref={activePathRef}
              d={path}
              stroke={adjustColorForMode(color)}
              strokeWidth={size}
              opacity={tool === "highlighter" ? 0.3 : 1}
              fill="none"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
      </div>
    </div>
  );
};

export default DrawMode;
