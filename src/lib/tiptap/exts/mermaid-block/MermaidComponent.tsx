import React, { useState, useRef, useEffect, useCallback } from "react";
import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import MermaidComponent from "../../../../utils/mermaid-renderer"; // Assuming you have this component from the previous conversion
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Transition,
} from "@headlessui/react";
import Icon from "@/components/UI/Icon";
import { useTranslation } from "@/utils/translations";

const MermaidNodeView: React.FC<NodeViewProps> = ({
  node,
  updateAttributes,
}) => {
  const [mermaidContent, setMermaidContent] = useState(
    node.attrs.content || ""
  );
  const [showModal, setShowModal] = useState(false);
  const [startY, setStartY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dialogPanelRef = useRef<HTMLDivElement>(null);
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
      const currentY = event.touches[0].clientY;
      const delta = currentY - startY;

      // Limit dragging to positive delta (downwards)
      if (delta > 0) {
        dialogPanelRef.current!.style.transform = `translateY(${delta}px)`;
      }
    },
    [startY, dragging]
  );

  const handleTouchEnd = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (!dragging) return;
      const currentY = event.changedTouches[0].clientY;
      const delta = currentY - startY;

      if (delta > 200) {
        // User has dragged down enough to close the modal
        closeModal();
      } else {
        // Animate back to original position
        dialogPanelRef.current!.style.transition = "transform 0.3s ease";
        dialogPanelRef.current!.style.transform = "translateY(0)";
      }

      // Reset states
      setDragging(false);
      setStartY(0);
    },
    [startY, dragging, closeModal]
  );

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
        <Transition show={showModal} as={React.Fragment}>
          <Dialog
            open={showModal}
            onClose={closeModal}
            className="fixed inset-0 z-50 overflow-y-auto"
            aria-labelledby="dialog-title"
            aria-modal="true"
          >
            <DialogBackdrop className="fixed inset-0 bg-neutral-300 dark:bg-neutral-600 bg-opacity-75 dark:bg-opacity-75 transition-opacity" />
            <div className="fixed inset-0 flex items-center justify-center">
              <Transition.Child
                as={React.Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 translate-y-full"
                enterTo="opacity-100 translate-y-0"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 translate-y-0"
                leaveTo="opacity-0 translate-y-full"
              >
                <DialogPanel
                  ref={dialogPanelRef}
                  className="relative w-full landscape:w-2/4 portrait:w-5/5 sm:w-3/5 sm:h-3/4 mt-32 sm:mt-12 h-full bg-white dark:bg-[#232222] rounded-xl shadow-xl overflow-hidden"
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  style={{
                    transition: dragging ? "none" : "transform 0.3s ease",
                  }}
                  aria-labelledby="dialog-title"
                >
                  <div className="flex justify-between items-center bg-gray-100 dark:bg-[#2D2C2C] px-4 py-3">
                    <DialogTitle
                      as="h3"
                      id="dialog-title"
                      className="text-lg font-semibold"
                    >
                      {translations.editor.editContent || "Edit Content"}
                    </DialogTitle>
                    <button
                      onClick={closeModal}
                      className="text-neutral-800 dark:text-[color:var(--selected-dark-text)]  bg-neutral-200 rounded-full hover:text-gray-700 focus:outline-none"
                      aria-label={translations.accessibility.close}
                    >
                      <Icon name="CloseLine" />
                    </button>
                  </div>
                  <div className="p-4 h-full flex flex-col">
                    <div className="flex-grow">
                      <textarea
                        id="mermaid-content-textarea"
                        ref={inputRef}
                        value={mermaidContent}
                        onChange={updateContent}
                        className="w-full h-full resize-none dark:bg-[#232222] p-2 rounded focus:outline-none"
                        placeholder={
                          translations.editor.mermaidContent ||
                          "Enter mermaid diagram content"
                        }
                      />
                    </div>
                  </div>
                </DialogPanel>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition>
      </div>
    </NodeViewWrapper>
  );
};

export default MermaidNodeView;
