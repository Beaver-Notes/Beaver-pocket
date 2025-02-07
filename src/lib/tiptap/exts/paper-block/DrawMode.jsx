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
  const [showPencilDropdown, setShowPencilDropdown] = useState(false);
  const [sliderValue, setSliderValue] = useState(2);
  const [showStyleOpt, setShowStyleOpt] = useState(false);
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
      <div className="fixed top-6 right-0 transform -translate-x-1/2 z-10 p-2 flex justify-between items-center bg-gray-100 dark:bg-neutral-800 rounded-xl shadow-md">
        <button
          onClick={() => {
            setShowStyleOpt(true);
          }}
          onMouseDown={(e) => e.preventDefault()}
          aria-label={translations.paperBlock.pencil}
          className={`relative flex items-center justify-center p-2 border ${
            tool === "pencil"
              ? "border-primary bg-primary"
              : "border-gray-300 dark:border-neutral-600"
          } rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary bg-neutral-100 dark:bg-neutral-800`}
        >
          <Icons.Brush3FillIcon className="w-6 h-6" />

          {/* Dropdown under the button */}
          {showStyleOpt && (
            <div className="draw w-fit absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-40 bg-white dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 shadow-md rounded-lg p-2 z-20">
              <div className="drawing-container flex flex-wrap gap-2 w-44">
                {["grid", "ruled", "dotted", "plain"].map((type) => (
                  <button
                    key={type}
                    className={`w-20 h-32 border ${type} ${
                      background === type ? "ring-1 ring-primary" : ""
                    }`}
                    onClick={() => {
                      setBackground(type);
                      updateAttributes({ paperType: type });
                    }}
                  ></button>
                ))}
              </div>
            </div>
          )}
        </button>
        <hr className="h-6 border-l border-gray-300 dark:border-neutral-600" />
        <button
          onClick={onClose}
          aria-label={translations.accessibility.close}
          className="p-2 rounded-full bg-gray-100 dark:bg-neutral-800 hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors"
        >
          <Icons.CloseLineIcon className="w-6 h-6" />
        </button>
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

      {/* Floating Toolbar */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-10 p-4 flex justify-between items-center bg-gray-100 dark:bg-neutral-800 rounded-xl shadow-md gap-2">
        <button
          onClick={() => {
            setTool("pencil");
            setColor(isDarkMode ? "#FFFFFF" : "#000000");
          }}
          onMouseDown={(e) => e.preventDefault()}
          aria-label={translations.paperBlock.pencil}
          className={`relative flex items-center justify-center p-2 border ${
            tool === "pencil"
              ? "border-primary bg-primary"
              : "border-gray-300 dark:border-neutral-600"
          } rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary bg-neutral-100 dark:bg-neutral-800`}
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
              ? "border-primary bg-primary"
              : "border-gray-300 dark:border-neutral-600"
          } rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary bg-neutral-100 dark:bg-neutral-800`}
        >
          <Icons.MarkPenLineIcon className="w-6 h-6" />
        </button>
        <button
          onClick={() => setTool("erase")}
          aria-label={translations.paperBlock.eraser}
          onMouseDown={(e) => e.preventDefault()}
          className={`flex items-center justify-center p-2 border ${
            tool === "erase"
              ? "border-primary bg-primary"
              : "border-gray-300 dark:border-neutral-600"
          } rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary bg-neutral-100 dark:bg-neutral-800`}
        >
          <Icons.EraserLineIcon className="w-6 h-6" />
        </button>
        <button
          onClick={() => {
            setShowPencilDropdown((prev) => !prev); // Toggle dropdown
          }}
          onMouseDown={(e) => e.preventDefault()}
          aria-label={translations.paperBlock.pencil}
          className={`relative flex items-center justify-center p-2 border ${
            tool === "pencil"
              ? "border-primary bg-primary"
              : "border-gray-300 dark:border-neutral-600"
          } rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary bg-neutral-100 dark:bg-neutral-800`}
        >
          {/* Dot representing thickness */}
          <div
            className="bg-black dark:bg-white rounded-full"
            style={{ width: `${size}px`, height: `${size}px` }}
          ></div>

          {/* Dropdown above the button */}
          {tool === "pencil" && showPencilDropdown && (
            <div
              className="absolute left-0 bottom-full mb-2 w-40 bg-white dark:bg-neutral-700 border border-gray-300 dark:border-neutral-600 shadow-md rounded-lg p-2 z-20"
              onClick={(e) => e.stopPropagation()} // Prevent closing on interaction
            >
              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
                {translations.paperBlock.size}
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={size}
                onChange={(e) => setSize(Number(e.target.value))}
                className="w-full"
              />
            </div>
          )}
        </button>
        <button
          onClick={undo}
          aria-label={translations.paperBlock.undo}
          onMouseDown={(e) => e.preventDefault()}
          className="flex items-center justify-center p-2 border border-gray-300 dark:border-neutral-600 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary bg-neutral-100 dark:bg-neutral-800"
        >
          <Icons.ArrowGoBackLineIcon className="w-6 h-6" />
        </button>
        <button
          onClick={redo}
          onMouseDown={(e) => e.preventDefault()}
          aria-label={translations.paperBlock.redo}
          className="flex items-center justify-center p-2 border border-gray-300 dark:border-neutral-600 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary bg-neutral-100 dark:bg-neutral-800"
        >
          <Icons.ArrowGoForwardLineIcon className="w-6 h-6" />
        </button>
        <div className="relative flex items-center space-x-4">
          <input
            type="range"
            min="1"
            max="50"
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="w-full cursor-pointer appearance-none bg-neutral-300 dark:bg-neutral-600 h-1 rounded-lg"
          />
          <span className="text-neutral-800 dark:text-[color:var(--selected-dark-text)]">
            {size}
          </span>
        </div>
        <div className="relative inline-block rounded-full">
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
            className={`flex items-center justify-center p-1 h-10 w-10 rounded-full hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary bg-neutral-100 dark:bg-neutral-800`}
          />
        </div>
      </div>
    </div>
  );
};

export default DrawMode;
