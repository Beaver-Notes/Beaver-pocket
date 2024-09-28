import React, { useState, useEffect, useCallback } from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';

const CodeBlockNodeView = ({ node, updateAttributes }) => {
  const [selectedLanguage, setSelectedLanguage] = useState(node.attrs.language || null);

  const handleLanguageChange = (e) => {
    const language = e.target.value;
    setSelectedLanguage(language);
    updateAttributes({ language });
  };

  useEffect(() => {
    setSelectedLanguage(node.attrs.language || null);
  }, [node]);

  return (
    <NodeViewWrapper className="relative">
      <div className="absolute right-0">
        <select
          value={selectedLanguage}
          onChange={handleLanguageChange}
          className="text-sm m-2 rounded bg-opacity-5 bg-black dark:bg-gray-300 dark:bg-opacity-5"
        >
          <option value={null}>auto</option>
          <option disabled>—</option>
          {node.extension.options.lowlight.listLanguages().map((language, index) => (
            <option key={index} value={language}>
              {language}
            </option>
          ))}
        </select>
      </div>
      <pre>
        <NodeViewContent as="code" />
      </pre>
    </NodeViewWrapper>
  );
};

export default CodeBlockNodeView;
