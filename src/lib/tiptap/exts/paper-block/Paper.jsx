import React, { useState, useRef, useEffect } from "react";
import "../../../../assets/css/paper.scss";
import { createPortal } from "react-dom";
import { NodeViewWrapper } from "@tiptap/react";
import Icons from "../../../remixicon-react";
import { v4 as uuid } from "uuid";
import DrawMode from "./DrawMode";

const PREVIEW_HEIGHT = 500;

const OverlayPortal = ({ children, onClose }) => {
  return createPortal(
    <div className="bg-neutral-100 dark:bg-neutral-800 absolute inset-0 z-50">
      {children}
    </div>,
    document.body
  );
};

const CustomNodeView = ({ node, updateAttributes }) => {
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [lines, setLines] = useState(node.attrs.lines || []);
  const [background, setBackground] = useState(node.attrs.paperType);

  const toggleDrawMode = () => {
    setIsDrawMode(!isDrawMode);
  };

  const closeDrawMode = () => {
    setIsDrawMode(false);
    setLines(node.attrs.lines || []);
    setBackground(node.attrs.paperType || []);
  };

  const [translations, setTranslations] = useState({
    paperBlock: {
      clicktoDraw: "paperBlock.clicktoDraw",
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

  // Preview Mode Component
  const PreviewMode = () => (
    <div
      className="cursor-pointer hover:opacity-80 transition-opacity"
      onClick={toggleDrawMode}
    >
      <div className="relative drawing-container">
        <svg
          viewBox={`0 0 500 ${PREVIEW_HEIGHT}`}
          style={{ height: PREVIEW_HEIGHT }}
          className={`w-full ${background}`}
        >
          {lines.map((line) => (
            <path
              key={line.id}
              d={line.path}
              stroke={line.color}
              strokeWidth={line.size}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20">
          <span className="text-white text-lg font-medium">
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
            onClose={closeDrawMode}
            updateAttributes={updateAttributes}
            node={node}
          />
        </OverlayPortal>
      ) : (
        <PreviewMode />
      )}
    </NodeViewWrapper>
  );
};

export default CustomNodeView;
