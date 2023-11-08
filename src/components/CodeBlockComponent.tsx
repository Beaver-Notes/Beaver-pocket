import "./css/Codeblock.css";
import { FC } from 'react';
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';

interface CodeBlockProps {
  node: {
    attrs: {
      language: string;
    };
  };
  updateAttributes: (attributes: { language: string }) => void;
  extension: {
    options: {
      lowlight: {
        listLanguages: () => string[];
      };
    };
  };
}

const CodeBlockComponent: FC<CodeBlockProps> = ({ node, updateAttributes, extension }) => {
  const { language: defaultLanguage } = node.attrs;

  return (
    <NodeViewWrapper className="code-block">
      <select
        contentEditable={false}
        defaultValue={defaultLanguage}
        onChange={(event) => updateAttributes({ language: event.target.value })}
      >
        <option value="null">auto</option>
        <option disabled>—</option>
        {extension.options.lowlight.listLanguages().map((lang, index) => (
          <option key={index} value={lang}>
            {lang}
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
