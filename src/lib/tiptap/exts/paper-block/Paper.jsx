import React, { useState, useRef, useEffect, useMemo } from "react";
import { getStroke } from "perfect-freehand";
import "../../../../assets/css/paper.scss";
import { createPortal } from "react-dom";
import { NodeViewWrapper } from "@tiptap/react";
import Icons from "../../../remixicon-react";
import { v4 as uuid } from "uuid";
import DrawMode from "./DrawMode";
import * as d3 from "d3"; 


const extractPointsFromPath = (pathString) => {
  if (!pathString) return [];

  const points = [];
  const matches = pathString.match(/[-+]?[0-9]*\.?[0-9]+/g);

  if (matches) {
    for (let i = 0; i < matches.length; i += 2) {
      if (matches[i + 1]) {
        points.push([parseFloat(matches[i]), parseFloat(matches[i + 1])]);
      }
    }
  }

  return points;
};


const convertLegacyLines = (lines) => {
  if (!lines || lines.length === 0) return [];

  return lines.map((line) => {
    
    if (line.points && Array.isArray(line.points)) return line;

    
    const pathString = line.path || line.d;
    if (pathString) {
      const points = extractPointsFromPath(pathString);

      return {
        points,
        tool: line.tool || "pen",
        color: line.color || "#000000",
        size: line.size || 2,
        path: pathString,
        d: pathString,
      };
    }

    
    return {
      points: line.points || [],
      tool: line.tool || "pen",
      color: line.color || "#000000",
      size: line.size || 2,
    };
  });
};


const convertToLegacyFormat = (lines) => {
  return lines.map((line) => {
    const legacyLine = {
      tool: line.tool,
      color: line.color,
      size: line.size,
      points: line.points,
    };

    if (line.points && line.points.length > 0) {
      const lineGenerator = d3
        .line()
        .x((d) => d[0])
        .y((d) => d[1])
        .curve(d3.curveBasis);

      legacyLine.path = lineGenerator(line.points);
      legacyLine.d = legacyLine.path;
    }

    return legacyLine;
  });
};


const getSvgPathFromStroke = (stroke) => {
  if (!stroke.length) return "";

  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ["M", ...stroke[0], "Q"]
  );

  d.push("Z");
  return d.join(" ");
};


const OverlayPortal = ({ children, onClose }) => {
  return createPortal(
    <div className="bg-neutral-100 dark:bg-neutral-800 absolute inset-0 z-50">
      {children}
    </div>,
    document.body
  );
};

const CustomNodeView = ({ node, updateAttributes }) => {
  
  const [lines, setLines] = useState(() =>
    convertLegacyLines(node.attrs.lines || [])
  );
  const [background, setBackground] = useState(node.attrs.paperType);
  const [tool, setTool] = useState("pen");
  const [height] = useState(node.attrs.height);
  const [isDrawMode, setIsDrawMode] = useState(false);

  const [translations, setTranslations] = useState({
    paperBlock: {
      clicktoDraw: "paperBlock.clicktoDraw",
    },
  });

  useEffect(() => {
    
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

  const getStrokeOptions = (settings) => ({
    size: settings.size,
    thinning: tool === "highlighter" ? 0 : 0.2,
    smoothing: 0.75,
    streamline: 0.7,
    easing: (t) => t,
    simulatePressure: false,
    last: true,
    start: { cap: true, taper: 0, easing: (t) => t },
    end: { cap: true, taper: 0, easing: (t) => t },
  });

  
  const toggleDrawMode = () => {
    setIsDrawMode(!isDrawMode);
  };

  
  const closeDrawMode = () => {
    setIsDrawMode(false);
    setLines(convertLegacyLines(node.attrs.lines || []));
    setBackground(node.attrs.paperType || []);
  };

  
  const renderedPaths = useMemo(() => {
    return lines.map((line, lineIndex) => {
      const stroke = getStroke(line.points, getStrokeOptions(line));
      const pathData = getSvgPathFromStroke(stroke);

      return (
        <path
          key={`line-${lineIndex}`}
          d={pathData}
          fill={line.color}
          stroke="none"
          strokeWidth="0"
          opacity={line.tool === "highlighter" ? 0.4 : 1}
        />
      );
    });
  }, [lines, tool]);

  
  const PreviewMode = () => (
    <div
      className="cursor-pointer hover:opacity-80 transition-opacity"
      onClick={toggleDrawMode}
    >
      <div className="relative drawing-container">
        <svg viewBox={`0 0 500 ${height}`} className={`w-full ${background}`}>
          {renderedPaths}
        </svg>
        <div className="absolute inset-0 flex items-end justify-center bg-black bg-opacity-15 rounded-xl">
          <span className="text-neutral-800 dark:text-[color:var(--selected-dark-text)] mb-6 text-lg font-medium">
            {translations.paperBlock.clicktoDraw}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <NodeViewWrapper
      className="draw select-none"
      style={{ touchAction: "none" }}
    >
      {isDrawMode ? (
        <OverlayPortal>
          <DrawMode
            onClose={() => {
              
              updateAttributes({
                lines: convertToLegacyFormat(lines),
              });
              closeDrawMode();
            }}
            updateAttributes={updateAttributes}
            node={node}
            lines={lines}
            setLines={setLines}
            tool={tool}
            setTool={setTool}
          />
        </OverlayPortal>
      ) : (
        <PreviewMode />
      )}
    </NodeViewWrapper>
  );
};

export default CustomNodeView;
