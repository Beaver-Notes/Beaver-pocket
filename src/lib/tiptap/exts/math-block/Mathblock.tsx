import React, { useCallback, useEffect, useRef, useState } from "react";
import { NodeViewWrapperProps, NodeViewWrapper } from "@tiptap/react";
import katex from "katex";
import Icon from "@/components/ui/Icon";
import { useTranslation } from "@/utils/translations";
import Sheet from "@/components/ui/Sheet"; // import your custom Sheet

interface MathBlockProps extends NodeViewWrapperProps {
  updateAttributes: (attributes: Record<string, any>) => void;
}

const MathBlock: React.FC<MathBlockProps> = (props) => {
  const [showSheet, setShowSheet] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [showSecondTextarea, setShowSecondTextarea] = useState(false);
  const [translations, setTranslations] = useState<Record<string, any>>({
    editor: {},
    accessibility: {},
  });
  const sheetRef = useRef<HTMLDivElement>(null);

  // Render KaTeX
  const renderContent = () => {
    let macros = {};
    try {
      if (props.node.attrs.macros) {
        macros = JSON.parse(props.node.attrs.macros);
      }
    } catch (e) {
      console.warn(
        "Invalid KaTeX macros JSON, falling back to empty object.",
        e
      );
      macros = {};
    }

    const mathContent = props.node.attrs.content || "Empty";
    const processedContent = `\\begin{aligned}${mathContent.replace(
      /\\\\/g,
      "\\\\"
    )}\\end{aligned}`;

    return katex.renderToString(processedContent, {
      macros,
      displayMode: true,
      throwOnError: false,
      output: "mathml",
    });
  };

  useEffect(() => {
    const fetchTranslations = async () => {
      const trans = await useTranslation();
      if (trans) setTranslations(trans);
    };
    fetchTranslations();
  }, []);

  const handleContentClick = () => setShowSheet(true);
  const closeSheet = useCallback(() => setShowSheet(false), []);

  // Touch handlers for swipe-to-dismiss
  const handleTouchStart = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      setStartY(event.touches[0].clientY);
      setDragging(true);
    },
    []
  );

  const handleTouchMove = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (!dragging) return;
      const delta = event.touches[0].clientY - startY;
      if (delta > 0 && sheetRef.current) {
        sheetRef.current.style.transform = `translateY(${delta}px)`;
      }
    },
    [startY, dragging]
  );

  const handleTouchEnd = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (!dragging) return;
      const delta = event.changedTouches[0].clientY - startY;
      if (delta > 200) closeSheet();
      else if (sheetRef.current) {
        sheetRef.current.style.transition = "transform 0.3s ease";
        sheetRef.current.style.transform = "translateY(0)";
      }

      setDragging(false);
      setStartY(0);
    },
    [startY, dragging, closeSheet]
  );

  const updateContent = (
    event: React.ChangeEvent<HTMLTextAreaElement>,
    key: string
  ) => {
    props.updateAttributes({ [key]: event.target.value });
  };

  const toggleSecondTextarea = () => setShowSecondTextarea(!showSecondTextarea);

  return (
    <NodeViewWrapper className="math-block-node-view">
      <div
        onClick={handleContentClick}
        className="overflow-x-auto max-w-full p-2 rounded-lg bg-neutral-50 dark:bg-neutral-900 cursor-text min-h-[2em]"
      >
        <p
          className="select-none"
          dangerouslySetInnerHTML={{ __html: renderContent() }}
          aria-label={translations.accessibility.editMath}
        />
      </div>

      {/* Custom Sheet */}
      <Sheet
        isOpen={showSheet}
        onClose={closeSheet}
        title={translations.editor.editContent || "-"}
        leftButton={
          <button
            title="Toggle KaTeX Macros"
            aria-label={
              showSecondTextarea
                ? translations.accessibility.disableKatex
                : translations.accessibility.enableKatex
            }
            className="p-1 text-neutral-800 dark:text-[color:var(--selected-dark-text)] bg-neutral-100 rounded-full hover:text-gray-700 focus:outline-none"
            onClick={toggleSecondTextarea}
          >
            <Icon name="Settings4Line" aria-hidden="true" />
          </button>
        }
        rightButton={
          <button
            onClick={closeSheet}
            className="p-1 text-neutral-800 dark:text-[color:var(--selected-dark-text)] bg-neutral-100 rounded-full hover:text-gray-700 focus:outline-none"
            aria-label={translations.accessibility.close}
          >
            <Icon name="CloseLine" aria-hidden="true" />
          </button>
        }
      >
        <div
          ref={sheetRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            transition: dragging ? "none" : undefined,
          }}
          className="flex flex-col h-[80vh]"
        >
          <div className="p-4 flex-grow flex flex-col space-y-2">
            <div
              className="overflow-x-auto max-w-full p-2 rounded-lg bg-neutral-50 dark:bg-neutral-900 cursor-text min-h-[2em]"
            >
              <p
                className="select-none"
                dangerouslySetInnerHTML={{ __html: renderContent() }}
                aria-label={translations.accessibility.editMath}
              />
            </div>
            <textarea
              id="content-textarea"
              value={props.node.attrs.content}
              onChange={(e) => updateContent(e, "content")}
              className="w-full h-full resize-none dark:bg-neutral-800 p-2 rounded focus:outline-none flex-grow"
              placeholder={translations.editor.mathContent || "-"}
            />
            {showSecondTextarea && (
              <textarea
                id="macros-textarea"
                value={props.node.attrs.macros}
                onChange={(e) => updateContent(e, "macros")}
                className="w-full h-full resize-none bg-neutral-100 dark:bg-neutral-900 p-3 rounded-xl focus:outline-none flex-grow"
                placeholder={translations.editor.katexMacros || "-"}
              />
            )}
          </div>
        </div>
      </Sheet>
    </NodeViewWrapper>
  );
};

export default MathBlock;
