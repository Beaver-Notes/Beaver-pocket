import { useState, useRef, useEffect, useMemo } from "react";
import * as d3 from "d3";
import { v4 as uuid } from "uuid";

export const thicknessOptions = {
  thin: 2,
  medium: 3,
  thick: 4,
  thicker: 5,
  thickest: 6,
};

export const backgroundStyles = {
  none: "",
  grid: "grid",
  ruled: "ruled",
  dotted: "dotted",
};

const BUFFER_ZONE = 50;
const INCREMENT_HEIGHT = 200;

export const useDrawing = ({ initialHeight = 400, initialLines = [], onUpdateAttributes }) => {
  const isDarkMode = document.documentElement.classList.contains("dark");
  const [drawing, setDrawing] = useState(false);
  const [points, setPoints] = useState([]);
  const [path, setPath] = useState("");
  const [svgHeight, setSvgHeight] = useState(initialHeight);
  const [tool, setTool] = useState("pencil");
  const [color, setColor] = useState(isDarkMode ? "#FFFFFF" : "#000000");
  const [size, setSize] = useState(thicknessOptions.thin);
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [background, setBackground] = useState(backgroundStyles.none);

  const svgRef = useRef(null);
  const linesRef = useRef(initialLines);
  const pathsGroupRef = useRef(null);
  const activePathRef = useRef(null);
  const throttleRef = useRef(null);
  const batchUpdateTimeoutRef = useRef(null);

  const lineGenerator = useMemo(
    () =>
      d3
        .line()
        .x((d) => d.x)
        .y((d) => d.y)
        .curve(d3.curveBasis),
    []
  );

  const smoothPoints = (points) => {
    if (points.length < 3) return points;
    return points.map((point, i, arr) => {
      if (i === 0 || i === arr.length - 1) return point;
      const prev = arr[i - 1];
      const next = arr[i + 1];
      return {
        x: (prev.x + point.x + next.x) / 3,
        y: (prev.y + point.y + next.y) / 3,
      };
    });
  };

  const batchUpdatePaths = () => {
    if (batchUpdateTimeoutRef.current) {
      clearTimeout(batchUpdateTimeoutRef.current);
    }

    batchUpdateTimeoutRef.current = setTimeout(() => {
      onUpdateAttributes({
        lines: linesRef.current,
      });
    }, 500);
  };

  const getPointerCoordinates = (event) => {
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;
    const scaleX = svg.viewBox.baseVal.width / rect.width;
    const scaleY = svg.viewBox.baseVal.height / rect.height;
    return [
      (clientX - rect.left) * scaleX,
      (clientY - rect.top) * scaleY,
    ];
  };

  const startDrawing = (x, y) => {
    setDrawing(true);
    setPoints([{ x, y }]);
  };

  const draw = (x, y) => {
    if (!drawing) return;

    const newPoints = [...points, { x, y }];
    setPoints(newPoints);
    const newPath = lineGenerator(smoothPoints(newPoints));
    setPath(newPath);

    if (y > svgHeight - BUFFER_ZONE) {
      const newHeight = svgHeight + INCREMENT_HEIGHT;
      setSvgHeight(newHeight);
      onUpdateAttributes({ height: newHeight });
    }
  };

  const stopDrawing = () => {
    if (drawing) {
      setDrawing(false);
      saveDrawing();
      setHistory((prevHistory) => [
        ...prevHistory,
        { action: "add", line: { id: uuid(), path, color, size, tool } },
      ]);
      setPath("");
      setPoints([]);
    }
  };

  const saveDrawing = () => {
    if (!path) return;

    const newLine = { id: uuid(), path, color, size, tool };
    linesRef.current = [...linesRef.current, newLine];
    batchUpdatePaths();
  };

  const undo = () => {
    if (history.length > 0) {
      const lastAction = history[history.length - 1];
      setHistory((prevHistory) => prevHistory.slice(0, -1));
      setRedoStack((prevStack) => [...prevStack, lastAction]);

      if (lastAction.action === "add") {
        linesRef.current = linesRef.current.filter(
          (line) => line.id !== lastAction.line.id
        );
      } else if (lastAction.action === "delete") {
        linesRef.current = [...linesRef.current, lastAction.line];
      }

      onUpdateAttributes({
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
        linesRef.current = [...linesRef.current, lastRedo.line];
      } else if (lastRedo.action === "delete") {
        linesRef.current = linesRef.current.filter(
          (line) => line.id !== lastRedo.line.id
        );
      }

      onUpdateAttributes({
        lines: linesRef.current,
      });
    }
  };

  const deletePath = (pathElement) => {
    const clickedPathData = pathElement.getAttribute("d");
    const pathIndex = linesRef.current.findIndex(
      (line) => line.path === clickedPathData
    );

    if (pathIndex !== -1) {
      const removedLine = linesRef.current[pathIndex];
      setHistory((prevHistory) => [
        ...prevHistory,
        { action: "delete", line: removedLine },
      ]);
      linesRef.current.splice(pathIndex, 1);
      onUpdateAttributes({
        lines: linesRef.current,
      });
    }
  };

  const adjustColorForMode = (color) => {
    if (isDarkMode) {
      return color === "#000000" ? "#FFFFFF" : color;
    } else {
      return color === "#FFFFFF" ? "#000000" : color;
    }
  };

  return {
    drawing,
    points,
    path,
    svgHeight,
    tool,
    color,
    size,
    background,
    history,
    redoStack,
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
  };
};