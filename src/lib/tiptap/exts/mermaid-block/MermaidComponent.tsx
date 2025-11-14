import React, { useState, useRef, useEffect, useCallback } from "react";
import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import MermaidComponent from "@/utils/mermaid-renderer";
import { useTranslation } from "@/utils/translations";
import Sheet from "@/components/ui/Sheet";

const MermaidNodeView: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
}) => {
  const [mermaidContent, setMermaidContent] = useState(
    node.attrs.content || ""
  );
  const [showModal, setShowModal] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [translations, setTranslations] = useState<Record<string, any>>({
    accessibility: {},
    editor: {},
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

  const updateContent = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const { value } = event.target;
      updateAttributes({ content: value });
      setMermaidContent(value);
    },
    [updateAttributes]
  );

  const openModal = useCallback(() => {
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
  }, []);

  useEffect(() => {
    setMermaidContent(node.attrs.content || "");
  }, [node.attrs.content]);

  return (
    <NodeViewWrapper>
      <div>
        <MermaidComponent
          className={
            node.attrs.selected ? "dark:text-purple-400 text-purple-500" : ""
          }
          content={mermaidContent}
          onClick={openModal}
          aria-label={translations.accessibility.editMermaid}
        />
        <Sheet
          isOpen={showModal}
          onClose={closeModal}
          title={translations.editor.editContent || "-"}
        >
          <div className="p-4 h-[80vh] flex flex-col">
            <div className="flex-grow">
              <MermaidComponent
                className={
                  node.attrs.selected
                    ? "dark:text-purple-400 text-purple-500"
                    : "bg-neutral-100 dark:bg-neutral-800 rounded-lg"
                }
                content={mermaidContent}
                aria-label={translations.accessibility.editMermaid}
              />
              <textarea
                id="mermaid-content-textarea"
                ref={inputRef}
                value={mermaidContent}
                onChange={updateContent}
                className="mt-4 w-full h-full resize-none dark:bg-neutral-800 p-2 rounded focus:outline-none"
                placeholder={
                  translations.editor.mermaidContent ||
                  "Enter mermaid diagram content"
                }
              />
            </div>
          </div>
        </Sheet>
      </div>
    </NodeViewWrapper>
  );
};

export default MermaidNodeView;
