import { useMemo, useRef } from "react";
import * as d3 from "d3";
import { v4 as uuid } from "uuid";

const isDarkMode = document.documentElement.classList.contains("dark");

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

/**
 * Smooths an array of points by averaging each point with its neighbors.
 * Retains the original start and end points.
 *
 * @param {Array} points - Array of points with {x, y} coordinates.
 * @returns {Array} - Smoothed array of points.
 */
export const smoothPoints = (points) => {
  if (points.length < 3) return points;
  return points.map((point, i, arr) => {
    if (i === 0 || i === arr.length - 1) return point; // Keep endpoints
    const prev = arr[i - 1];
    const next = arr[i + 1];
    return {
      x: (prev.x + point.x + next.x) / 3,
      y: (prev.y + point.y + next.y) / 3,
    };
  });
};

export const useChunkedLines = (linesRef) => {
  return useMemo(() => {
    if (!linesRef.current) return []; // Guard against undefined or uninitialized ref
    const chunkSize = 100; // Adjust based on performance needs
    const chunks = [];
    for (let i = 0; i < linesRef.current.length; i += chunkSize) {
      chunks.push(linesRef.current.slice(i, i + chunkSize));
    }
    return chunks;
  }, [linesRef.current?.length]); // Use optional chaining to avoid errors
};

export const useEraseOverlappingPaths = (
  svgRef,
  linesRef,
  setHistory,
  updateAttributes
) => {
  const svg = d3.select(svgRef?.current);
  const eraseRadius = 5;
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
      updateAttributes({
        lines: linesRef.current,
      });
    }
  };

  return eraseOverlappingPaths;
};

export const useGetPointerCoordinates = (svgRef) => {
  const getPointerCoordinates = (event) => {
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();

    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;

    const scaleX = svg.viewBox.baseVal.width / rect.width;
    const scaleY = svg.viewBox.baseVal.height / rect.height;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    return [x, y];
  };
  return getPointerCoordinates;
};

export const useSaveDrawing = (
  linesRef,
  setHistory,
  updateAttributes,
  path,
  color,
  size,
  tool,
  setRedoStack
) => {
  const batchUpdateTimeoutRef = useRef(null);

  const saveDrawing = () => {
    if (!path) return;

    // Check if it's a dot by looking at the path length
    const isDot = path.length < 10;

    // Halve the width for dots
    const adjustedSize = isDot ? size / 2 : size;

    const newLine = {
      id: uuid(),
      path,
      color,
      size: adjustedSize,
      tool,
    };

    linesRef.current = [...linesRef.current, newLine];

    setHistory((prevHistory) => [
      ...prevHistory,
      { action: "add", line: newLine },
    ]);

    setRedoStack([]);
    batchUpdatePaths();
  };

  const batchUpdatePaths = () => {
    if (batchUpdateTimeoutRef.current) {
      clearTimeout(batchUpdateTimeoutRef.current);
    }

    batchUpdateTimeoutRef.current = setTimeout(() => {
      updateAttributes({
        lines: linesRef.current,
      });
    }, 500);
  };

  return saveDrawing;
};

export const useRenderPaths = (chunkedLines) => {
  const renderPaths = () =>
    chunkedLines.map((chunk, chunkIndex) => (
      <g key={`chunk-${chunkIndex}`}>
        {chunk.map((item) => {
          // Apply the same dot width logic in the renderer
          const isDot = item.path.length < 10;
          const strokeWidth = isDot ? item.size : item.size;

          return (
            <path
              key={`${item.id}-${item.color}-${item.size}`}
              d={item.path}
              stroke={adjustColorForMode(item.color)}
              strokeWidth={strokeWidth}
              opacity={item.tool === "highlighter" ? 0.3 : 1}
              fill="none"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </g>
    ));

  const adjustColorForMode = (color) => {
    if (isDarkMode) {
      return color === "#000000" ? "#FFFFFF" : color;
    } else {
      return color === "#FFFFFF" ? "#000000" : color;
    }
  };

  return renderPaths;
};

// Rest of the code remains the same...
export const useLineGenerator = () => {
  const lineGenerator = useMemo(
    () =>
      d3
        .line()
        .x((d) => d.x)
        .y((d) => d.y)
        .curve(d3.curveBasis),
    []
  );
  return lineGenerator;
};

export const useRedo = (
  redoStack,
  setRedoStack,
  setHistory,
  updateAttributes,
  linesRef
) => {
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

      updateAttributes({
        lines: linesRef.current,
      });
    }
  };
  return redo;
};

export const useUndo = (
  history,
  setHistory,
  setRedoStack,
  updateAttributes,
  linesRef
) => {
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

      updateAttributes({
        lines: linesRef.current,
      });
    }
  };
  return undo;
};
