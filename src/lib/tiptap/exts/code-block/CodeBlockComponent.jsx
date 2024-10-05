import React, { useState, useEffect } from 'react';
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';

const CodeBlockComponent = ({ node, updateAttributes, extension }) => {
  const [selectedLanguage, setSelectedLanguage] = useState(node.attrs.language || '');

  // Handle language change and update attributes
  const handleLanguageChange = (event) => {
    const language = event.target.value;
    setSelectedLanguage(language);
    updateAttributes({ language });
  };

  useEffect(() => {
    // Set initial language from node attributes
    setSelectedLanguage(node.attrs.language || '');
  }, [node.attrs.language]);

  return (
    <NodeViewWrapper className="relative">
      <select
        value={selectedLanguage || ''}
        onChange={handleLanguageChange}
        contentEditable={false}
        className="absolute text-sm right-0 m-2 rounded bg-opacity-5 bg-black dark:bg-gray-300 dark:bg-opacity-5"
      >
        <option value="">auto</option> {/* Use empty string instead of null */}
        <option disabled>—</option>
        {extension.options.lowlight.listLanguages().map((language, index) => (
          <option key={index} value={language}>
            {language}
          </option>
        ))}
      </select>
      <pre>
        <NodeViewContent as="code" />
      </pre>
    </NodeViewWrapper>
  );
};

export default CodeBlockComponent;
