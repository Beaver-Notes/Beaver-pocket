import React, { useEffect, useState } from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import icons from '../../../remixicon-react';

interface FileEmbedComponentProps extends NodeViewProps {}

const FileEmbedComponent: React.FC<FileEmbedComponentProps> = ({ node }) => {
  const [fileName, setFileName] = useState(node.attrs.fileName);

  useEffect(() => {
    setFileName(node.attrs.fileName);
  }, [node.attrs.fileName]);

  const openDocument = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault(); // Prevent default action
    const src = node.attrs.src;
    const fileName = node.attrs.fileName;
    if (src && fileName) {
      const eventData = { src, fileName };
      const customEvent = new CustomEvent('fileEmbedClick', { detail: eventData });
      document.dispatchEvent(customEvent); // Dispatch custom event
    }
  };


  return (
    <NodeViewWrapper>
      <div className="mt-2 mb-2 file-embed bg-neutral-100 dark:bg-[#353333] p-3 rounded-lg flex items-center justify-between">
        <div className="flex items-center cursor-pointer">
          <icons.FileIcon className="w-6 h-6 mr-2" />
          <span>{fileName}</span>
        </div>
        <button
          className="download-button bg-input p-1 px-3 rounded-lg outline-none"
          onClick={openDocument}
        >
          <icons.EyeLineIcon className="w-6 h-6" />
        </button>
      </div>
    </NodeViewWrapper>
  );
};

export default FileEmbedComponent;
