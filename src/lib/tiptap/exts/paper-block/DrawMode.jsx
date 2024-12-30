import React, { useState, useRef, useEffect, useMemo } from "react";
import * as d3 from "d3";
import { v4 as uuid } from "uuid";
import { Keyboard } from "@capacitor/keyboard";
import Icons from "../../../remixicon-react";
import {
  smoothPoints,
  useChunkedLines,
  useEraseOverlappingPaths,
  useGetPointerCoordinates,
  thicknessOptions,
  backgroundStyles,
  useSaveDrawing,
  useRenderPaths,
  useLineGenerator,
  useRedo,
  useUndo,
} from "./drawingUtils";
import paperBlock from ".";

const BUFFER_ZONE = 50;
const INCREMENT_HEIGHT = 200;
const PREVIEW_HEIGHT = 500;

const DrawMode = ({ onClose, updateAttributes, node }) => {
  const pathsGroupRef = useRef(null);
  const activePathRef = useRef(null);
  const throttleRef = useRef(null);
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
  const chunkedLines = useChunkedLines(linesRef);
  const eraseOverlappingPaths = useEraseOverlappingPaths(
    svgRef,
    linesRef,
    setHistory,
    updateAttributes
  );
  const getPointerCoordinates = useGetPointerCoordinates(svgRef);
  const saveDrawing = useSaveDrawing(
    linesRef,
    setHistory,
    updateAttributes,
    path,
    color,
    size,
    tool,
    setRedoStack
  );
  const renderPaths = useRenderPaths(chunkedLines);
  const lineGenerator = useLineGenerator();
  const redo = useRedo(
    redoStack,
    setRedoStack,
    setHistory,
    updateAttributes,
    linesRef
  );
  const undo = useUndo(
    history,
    setHistory,
    setRedoStack,
    updateAttributes,
    linesRef
  );

  const handleBackgroundChange = (event) => {
    const newBackground = event.target.value;
    setBackground(newBackground);
    updateAttributes({ paperType: newBackground });
  };

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    const eraseRadius = 5;
    let isErasing = false;
    let penActive = false;
    let penTimeout = null;

    const PEN_TIMEOUT_DURATION = 700;

    const handlePointerEvent = (event) => {
      if (event.pointerType === "pen" || event.pointerType === "mouse") {
        penActive = true;
        clearTimeout(penTimeout);
        event.preventDefault(); // Prevent touch interaction when pen is active
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

    // Prevent scrolling when the pencil (pen) is active
    const preventScrolling = (event) => {
      if (penActive) {
        event.preventDefault(); // Prevent scrolling
        event.stopPropagation();
      }
    };

    // Attach pen input handlers on SVG
    svg
      .on("pointerdown", handlePointerEvent)
      .on("pointermove", handlePointerEvent)
      .on("pointerup", handlePointerEvent);

    // Block touch interactions (scrolling) when pen is active
    document.body.addEventListener("touchstart", preventScrolling, {
      passive: false,
    });
    document.body.addEventListener("touchmove", preventScrolling, {
      passive: false,
    });
    document.body.addEventListener("touchend", preventScrolling, {
      passive: false,
    });

    // Cleanup on component unmount
    return () => {
      clearTimeout(penTimeout);
      document.body.removeEventListener("touchstart", preventScrolling);
      document.body.removeEventListener("touchmove", preventScrolling);
      document.body.removeEventListener("touchend", preventScrolling);
    };
  }, [tool, color, size, points]);

  const handleMouseDown = (event) => {
    event.preventDefault();
  };

  useEffect(() => {
    const disableScroll = (event) => {
      if (isDrawing) {
        event.preventDefault();
      }
    };

    const showListener = Keyboard.addListener("keyboardWillShow", () => {
      Keyboard.hide();
    });

    document.addEventListener("touchmove", disableScroll, { passive: false });
    document.addEventListener("wheel", disableScroll, { passive: false });

    return () => {
      document.removeEventListener("touchmove", disableScroll);
      document.removeEventListener("wheel", disableScroll);
      showListener.remove();
    };
  }, [isDrawing]);

  const startDrawing = (x, y) => {
    setDrawing(true);
    setPoints([{ x, y }]);
  };

  const draw = (x, y) => {
    if (!drawing) return;

    const newPoints = [...points, { x, y }];
    setPoints(newPoints);
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

  const saveHeight = () => {
    updateAttributes({ height: svgHeight });
  };

  const adjustColorForMode = (color) => {
    if (isDarkMode) {
      // Dark mode: Black turns to white; other colors unchanged
      return color === "#000000" ? "#FFFFFF" : color;
    } else {
      // Light mode: White turns to black; other colors unchanged
      return color === "#FFFFFF" ? "#000000" : color;
    }
  };

  const [translations, setTranslations] = useState({
    paperBlock: {
      thin: "paperBlock.thin",
      medium: "paperBlock.medium",
      thick: "paperBlock.thick",
      thicker: "paperBlock.thicker",
      none: "paperBlock.none",
      grid: "paperBlock.grid",
      ruled: "paperBlock.ruled",
      dotted: "paperBlock.dotted",
      pencil: "paperBlock.pencil",
      highlighter: "paperBlock.highlighter",
      eraser: "paperBlock.eraser",
      undo: "paperBlock.undo",
      redo: "paperBlock.redo",
    },
    accessibility: {
      close: "accessibility.close",
    },
  });

  useEffect(() => {
    // Load translations
    const loadTranslations = async () => {
      const selectedLanguage = localStorage.getItem("selectedLanguage") || "en";
      try {
        const translationModule = await import(
          `../../../../assets/locales/${selectedLanguage}.json`
        );

        setTranslations({ ...translations, ...translationModule.default });
      } catch (error) {
        console.error("Error loading translations:", error);
      }
    };

    loadTranslations();
  }, []);

  return (
    <div className="draw w-full min-h-screen flex flex-col">
      {/* Top Toolbar */}
      <div className="mt-2 sticky top-0 z-10 p-4 flex justify-between items-center bg-gray-100 dark:bg-neutral-800 rounded-none shadow-md">
        {/* Left side controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setTool("pencil");
              setSize(2);
              setColor(isDarkMode ? "#FFFFFF" : "#000000");
            }}
            onMouseDown={(e) => e.preventDefault()}
            aria-label={translations.paperBlock.pencil}
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
              setSize(8);
              setColor("#FFFF00");
            }}
            onMouseDown={(e) => e.preventDefault()}
            aria-label={translations.paperBlock.highlighter}
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
            aria-label={translations.paperBlock.eraser}
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
              <option value="none">
                {translations.paperBlock.none || "-"}
              </option>
              <option value="grid">
                {translations.paperBlock.grid || "-"}
              </option>
              <option value="ruled">
                {translations.paperBlock.ruled || "-"}
              </option>
              <option value="dotted">
                {translations.paperBlock.dotted || "-"}
              </option>
            </select>
            <Icons.ArrowDownSLineIcon className="dark:text-[color:var(--selected-dark-text)] ri-arrow-down-s-line absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-600 pointer-events-none" />
          </div>
        </div>
        {/* Right side controls */}
        <div className="flex items-center space-x-2">
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
          <div className="relative">
            <select
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="border border-neutral-300 dark:border-neutral-600 rounded w-full p-2 text-neutral-800 bg-[#F8F8F7] dark:bg-[#2D2C2C] dark:text-[color:var(--selected-dark-text)] outline-none appearance-none mr-6"
            >
              {tool === "pencil" && (
                <>
                  <option value={2}>{translations.paperBlock.thin}</option>
                  <option value={3}>{translations.paperBlock.medium}</option>
                  <option value={4}>{translations.paperBlock.thick}</option>
                  <option value={5}>{translations.paperBlock.thicker}</option>
                </>
              )}
              {tool === "highlighter" && (
                <>
                  <option value={8}>{translations.paperBlock.thin}</option>
                  <option value={9}>{translations.paperBlock.medium}</option>
                  <option value={10}>{translations.paperBlock.thick}</option>
                  <option value={11}>{translations.paperBlock.thicker}</option>
                </>
              )}
            </select>
            <Icons.ArrowDownSLineIcon className="dark:text-[color:var(--selected-dark-text)] ri-arrow-down-s-line absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-600 pointer-events-none" />
          </div>
          <button
            onClick={undo}
            aria-label={translations.paperBlock.undo}
            onMouseDown={(e) => e.preventDefault()}
            className="flex items-center justify-center p-2 border border-gray-300 dark:border-neutral-600 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-neutral-100 dark:bg-neutral-800"
          >
            <Icons.ArrowGoBackLineIcon className="w-6 h-6" />
          </button>
          <button
            onClick={redo}
            onMouseDown={(e) => e.preventDefault()}
            aria-label={translations.paperBlock.redo}
            className="flex items-center justify-center p-2 border border-gray-300 dark:border-neutral-600 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-neutral-100 dark:bg-neutral-800"
          >
            <Icons.ArrowGoForwardLineIcon className="w-6 h-6" />
          </button>
          <button
            onClick={onClose}
            aria-label={translations.accessibility.close}
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
