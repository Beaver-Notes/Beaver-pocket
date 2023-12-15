import React, { useEffect, useRef, useState } from 'react';
import katex from 'katex';

interface MathBlockProps {
  node: {
    attrs: {
      content: string;
      macros: string;
    };
  };
  updateAttributes: (attributes: { [key: string]: any }) => void;
  editor: {
    isActive: (name: string) => boolean;
    commands: {
      focus: () => void;
    };
  };
}

const MathBlock = ({ node, updateAttributes, editor }: MathBlockProps) => {
  const contentRef = useRef<HTMLParagraphElement | null>(null);
  const [useKatexMacros, setUseKatexMacros] = useState(false);
  const [isContentChange, setIsContentChange] = useState(false);

  const renderContent = () => {
    let macros = {};

    try {
      macros = JSON.parse(node.attrs.macros);
    } catch (error) {
      // Do nothing
    }

    katex.render(node.attrs.content || 'Empty', contentRef?.current || document.createElement('div'), {
      macros,
      displayMode: true,
      throwOnError: false,
    });
  };

  const updateContent = (event: React.ChangeEvent<HTMLTextAreaElement>, key: string, isRenderContent: boolean) => {
    setIsContentChange(true);
    updateAttributes({ [key]: event.target.value });

    if (isRenderContent) renderContent();
  };

  const handleKeydown = (event: React.KeyboardEvent) => {
    const { ctrlKey, shiftKey, metaKey, key } = event;

    const isModEnter = (ctrlKey || metaKey) && key === 'Enter';
    const isMacrosShortcut = (ctrlKey || metaKey) && shiftKey && key === 'M';
    const isNotEdited =
      editor.isActive('mathBlock') && !isContentChange && ['ArrowUp', 'ArrowDown'].includes(key);

    if (isModEnter || isNotEdited) {
      editor.commands.focus();
      setIsContentChange(false);
      setUseKatexMacros(false);
    } else if (isMacrosShortcut) {
      setUseKatexMacros(!useKatexMacros);
    }
  };

  useEffect(() => {
    updateAttributes({ init: 'true' });
    renderContent();
  }, []);

  return (
    <div>
      <p
        ref={contentRef}
        className={useKatexMacros ? 'dark:text-purple-400 text-purple-500' : ''}
      ></p>
      {useKatexMacros ? (
        <div className="bg-input transition rounded-lg p-2">
          <div className="flex mb-2">
            <textarea
              value={node.attrs.content}
              placeholder="Text here..."
              className="bg-transparent flex-1"
              onChange={(event) => updateContent(event, 'content', true)}
              onKeyDown={handleKeydown}
            />
            <textarea
              value={node.attrs.macros}
              placeholder="KaTeX macros"
              className="bg-transparent ml-2 pl-2 border-l flex-1"
              onChange={(event) => updateContent(event, 'macros', true)}
              onKeyDown={handleKeydown}
            />
          </div>
          <div className="flex border-t items-center pt-2 text-gray-600 dark:text-gray-300">
            <img src="@/assets/svg/katex.svg" width="48" style={{ margin: 0 }} />
            <div className="flex-grow"></div>
            {isContentChange && (
              <p className="text-sm" style={{ margin: 0 }}>
                Press <strong>Ctrl</strong>+<strong>Enter</strong> to exit from math block
              </p>
            )}
            <button
              title="KaTeX Macros (Ctrl+Shift+M)"
              className={useKatexMacros ? 'text-primary' : ''}
              onClick={() => setUseKatexMacros(!useKatexMacros)}
            >
              Toggle Macros
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default MathBlock;
