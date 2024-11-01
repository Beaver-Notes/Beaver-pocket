import React, { useEffect, useState } from "react";
import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import icons from "../../../remixicon-react";

interface FileEmbedComponentProps extends NodeViewProps {}

const FileEmbedComponent: React.FC<FileEmbedComponentProps> = ({ node }) => {
  const [fileName, setFileName] = useState(node.attrs.fileName);

  useEffect(() => {
    setFileName(node.attrs.fileName);
  }, [node.attrs.fileName]);

  const [translations, setTranslations] = useState({
    accessibility: {
      open: "accessibility.open",
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

  const openDocument = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault(); // Prevent default action
    const src = node.attrs.src;
    const fileName = node.attrs.fileName;
    if (src && fileName) {
      const eventData = { src, fileName };
      const customEvent = new CustomEvent("fileEmbedClick", {
        detail: eventData,
      });
      document.dispatchEvent(customEvent); // Dispatch custom event
    }
  };

  return (
    <NodeViewWrapper>
      <div
        className="mt-2 mb-2 file-embed bg-neutral-100 dark:bg-[#353333] p-3 rounded-lg flex items-center justify-between"
        role="region"
        aria-label={`${fileName}`}
      >
        <div className="flex items-center cursor-pointer" role="presentation">
          <icons.FileIcon className="w-6 h-6 mr-2" aria-hidden="true" />
          <span>{fileName}</span>
        </div>
        <button
          className="download-button bg-input p-1 px-3 rounded-lg outline-none"
          onClick={openDocument}
          aria-label={`${translations.accessibility.open} ${fileName}`}
        >
          <icons.EyeLineIcon className="w-6 h-6" aria-hidden="true" />
        </button>
      </div>
    </NodeViewWrapper>
  );
};

export default FileEmbedComponent;
