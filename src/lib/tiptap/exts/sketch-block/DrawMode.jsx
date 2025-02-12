import React, { useState, useRef, useEffect, useMemo } from "react";
import * as d3 from "d3";
import { v4 as uuid } from "uuid";
import { Keyboard } from "@capacitor/keyboard";
import Icons from "../../../remixicon-react";
import { useTranslation } from "../../../../utils/translations";
import {
  smoothPoints,
  useChunkedLines,
  useEraseOverlappingPaths,
  useGetPointerCoordinates,
  thicknessOptions,
  backgroundStyles,
  useSaveDrawing,
  useRenderPaths,
  useRedo,
  useUndo,
  useDraw,
} from "./drawingUtils";

const PREVIEW_HEIGHT = 500;

const DrawMode = ({ onClose, updateAttributes, node }) => {
  const sizes = [4, 6, 8];
  const [showPencilDropdown, setShowPencilDropdown] = useState(false);
  const [showStyleOpt, setShowStyleOpt] = useState(false);
  const pathsGroupRef = useRef(null);
  const activePathRef = useRef(null);
  const throttleRef = useRef(null);
  const isDarkMode = document.documentElement.classList.contains("dark");
  const [isDrawing, setIsDrawing] = useState(false);
  const svgRef = useRef(null);
  const [color, setColor] = useState(isDarkMode ? "#FFFFFF" : "#000000");
  const [size, setSize] = useState(thicknessOptions.thin);
  const [drawing, setDrawing] = useState(false);
  const [points, setPoints] = useState([]);
  const [path, setPath] = useState("");
  const [svgHeight, setSvgHeight] = useState(node.attrs.height || 400);
  const [tool, setTool] = useState("pencil");
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
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
  const draw = useDraw(drawing, points, setPoints, setPath, svgHeight);
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

  const startDrawing = (x, y) => {
    setDrawing(true);
    setPoints([{ x, y }]);
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
    paperBlock: {},
    accessibility: {},
  });

  useEffect(() => {
    const fetchTranslations = async () => {
      const trans = await useTranslation();
      if (trans) {
        setTranslations(trans);
      }
    };
    fetchTranslations();
  }, []);

  return (
    <div className="draw w-full min-h-screen flex flex-col">
      {/* Top Toolbar */}
      <div className="fixed top-6 right-0 transform -translate-x-1/2 z-10 p-2 flex justify-between items-center bg-neutral-100 dark:bg-neutral-800 rounded-xl shadow-md">
        {/* Background Selection */}
        <button
          onClick={() => setShowStyleOpt(true)}
          aria-label={translations.paperBlock.pencil}
          className={`relative flex items-center justify-center p-2 dark:border-neutral-600 rounded hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary bg-neutral-100 dark:bg-neutral-800`}
        >
          <Icons.Brush3FillIcon className="w-6 h-6" />
          {showStyleOpt && (
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-40 bg-white dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 shadow-md rounded-lg p-2 z-20">
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
        <hr className="h-6 border-l border-neutral-300 dark:border-neutral-600" />
        <button
          onClick={onClose}
          aria-label={translations.accessibility.close}
          className="p-2 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
        >
          <Icons.CloseLineIcon className="w-6 h-6" />
        </button>
      </div>

      {/* SVG Container */}
      <div className="relative flex-grow drawing-container">
        <svg
          ref={svgRef}
          viewBox={`0 0 500 ${svgHeight}`}
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
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-10 p-4 flex justify-between items-center bg-neutral-100 dark:bg-neutral-800 rounded-xl shadow-md gap-2">
        <button
          onClick={undo}
          aria-label={translations.paperBlock.undo}
          className="flex items-center justify-center p-2 border border-neutral-300 dark:border-neutral-600 rounded hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary bg-neutral-100 dark:bg-neutral-800"
        >
          <Icons.ArrowGoBackLineIcon className="w-6 h-6" />
        </button>
        <button
          onClick={redo}
          aria-label={translations.paperBlock.redo}
          className="flex items-center justify-center p-2 border border-neutral-300 dark:border-neutral-600 rounded hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary bg-neutral-100 dark:bg-neutral-800"
        >
          <Icons.ArrowGoForwardLineIcon className="w-6 h-6" />
        </button>
        <button
          onClick={() => {
            setTool("pencil");
            setColor(isDarkMode ? "#FFFFFF" : "#000000");
          }}
          aria-label={translations.paperBlock.pencil}
          className={`relative flex items-center justify-center p-2 border ${
            tool === "pencil"
              ? "border-primary bg-primary"
              : "border-neutral-300 dark:border-neutral-600"
          } rounded hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary bg-neutral-100 dark:bg-neutral-800`}
        >
          <Icons.BallPenLine className="w-6 h-6" />
        </button>
        <button
          onClick={() => {
            setTool("highlighter");
            setSize(8);
            setColor("#FFFF00");
          }}
          aria-label={translations.paperBlock.highlighter}
          className={`flex items-center justify-center p-2 border ${
            tool === "highlighter"
              ? "border-primary bg-primary"
              : "border-neutral-300 dark:border-neutral-600"
          } rounded hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary bg-neutral-100 dark:bg-neutral-800`}
        >
          <Icons.MarkPenLineIcon className="w-6 h-6" />
        </button>
        <button
          onClick={() => setTool("erase")}
          aria-label={translations.paperBlock.eraser}
          className={`flex items-center justify-center p-2 border ${
            tool === "erase"
              ? "border-primary bg-primary"
              : "border-neutral-300 dark:border-neutral-600"
          } rounded hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary bg-neutral-100 dark:bg-neutral-800`}
        >
          <Icons.EraserLineIcon className="w-6 h-6" />
        </button>
        <div className="flex gap-2">
          {sizes.map((s) => (
            <button
              key={s}
              onClick={() => setSize(s)}
              onMouseDown={(e) => e.preventDefault()}
              className={`flex items-center justify-center p-1 border ${
                size === s
                  ? "border-primary"
                  : "border-neutral-300 dark:border-neutral-600"
              } h-10 w-10 rounded hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-neutral-100 dark:bg-neutral-800`}
            >
              <svg
                width={s}
                height={s}
                className="rounded-full"
                style={{ backgroundColor: color }}
              />
            </button>
          ))}
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
            className={`flex items-center justify-center p-1 h-10 w-10 rounded-full hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-primary bg-neutral-100 dark:bg-neutral-800`}
          />
        </div>
      </div>
    </div>
  );
};

export default DrawMode;
