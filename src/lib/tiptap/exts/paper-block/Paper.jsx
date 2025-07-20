import React, { useState, useRef, useEffect, useMemo } from "react";
import { getStroke } from "perfect-freehand";
import "../../../../assets/css/paper.scss";
import { createPortal } from "react-dom";
import {
  convertLegacyLines,
  convertToLegacyFormat,
  getSvgPathFromStroke,
  getStrokeOptions,
} from "./helpers/drawHelper";
import { NodeViewWrapper } from "@tiptap/react";
import { v4 as uuid } from "uuid";
import DrawMode from "./DrawMode";
import * as d3 from "d3";
import paperBlock from ".";

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
    paperBlock: {},
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
