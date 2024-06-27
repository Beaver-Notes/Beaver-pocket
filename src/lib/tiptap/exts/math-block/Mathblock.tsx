import React, { useState, useRef, useEffect, useCallback } from "react";
import { NodeViewWrapper, NodeViewProps } from "@tiptap/react";
import katex from "katex";
import "../../../../css/main.css";
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle, Transition } from '@headlessui/react';

const MathBlock: React.FC<NodeViewProps> = ({ node, updateAttributes }) => {
  const [mathContent, setMathContent] = useState(node.attrs.content || "");
  const [katexMacros, setKatexMacros] = useState(node.attrs.macros || "");
  const [showModal, setShowModal] = useState(false);
  const [showMacrosTextarea, setShowMacrosTextarea] = useState(false);
  const [startY, setStartY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dialogPanelRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLParagraphElement>(null);

  const updateContent = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>, key: string) => {
      const { value } = event.target;
      if (key === "content") {
        updateAttributes({ content: value });
        setMathContent(value);
      } else if (key === "macros") {
        updateAttributes({ macros: value });
        setKatexMacros(value);
      }
      renderContent(value, katexMacros);
    },
    [updateAttributes, katexMacros]
  );

  const renderContent = useCallback(
    (content: string, macros: string) => {
      let parsedMacros = {};
      try {
        parsedMacros = JSON.parse(macros);
      } catch (error) {
        // Do nothing
      }
      const mathML = katex.renderToString(content, {
        macros: parsedMacros,
        displayMode: true,
        throwOnError: false,
        output: "mathml",
      });
      if (contentRef.current) {
        contentRef.current.innerHTML = mathML;
      }
    },
    []
  );

  const openModal = useCallback(() => {
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
  }, []);

  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    setStartY(event.touches[0].clientY);
    setDragging(true);
  }, []);

  const handleTouchMove = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const currentY = event.touches[0].clientY;
    const delta = currentY - startY;

    if (delta > 0) {
      dialogPanelRef.current!.style.transform = `translateY(${delta}px)`;
    }
  }, [startY, dragging]);

  const handleTouchEnd = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const currentY = event.changedTouches[0].clientY;
    const delta = currentY - startY;

    if (delta > 200) {
      closeModal();
    } else {
      dialogPanelRef.current!.style.transition = "transform 0.3s ease";
      dialogPanelRef.current!.style.transform = "translateY(0)";
    }

    setDragging(false);
    setStartY(0);
  }, [startY, dragging, closeModal]);

  useEffect(() => {
    setMathContent(node.attrs.content || "");
    setKatexMacros(node.attrs.macros || "");
    renderContent(node.attrs.content || "", node.attrs.macros || "");
  }, [node.attrs.content, node.attrs.macros, renderContent]);

  return (
    <NodeViewWrapper>
      <div>
        <p
          ref={contentRef}
          className={`${node.attrs.selected ? "bg-[#F8F8F7] dark:bg-[#353333] dark:text-purple-400 text-purple-500" : ""}`}
          onClick={openModal}
        ></p>
        <Transition show={showModal} as={React.Fragment}>
          <Dialog open={showModal} onClose={closeModal} className="fixed inset-0 z-50 overflow-y-auto">
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
                  className="relative w-full sm:mx-auto sm:w-3/5 sm:h-3/4 mt-32 sm:mt-12 h-full bg-white dark:bg-[#232222] rounded-xl shadow-xl overflow-hidden"
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  style={{ transition: dragging ? "none" : "transform 0.3s ease" }}
                >
                  <div className="flex justify-between items-center bg-gray-100 dark:bg-[#2D2C2C] px-4 py-3">
                    <DialogTitle as="h3" className="text-lg font-semibold">
                      Edit Content
                    </DialogTitle>
                    <button
                      onClick={closeModal}
                      className="text-amber-400 hover:text-gray-700 focus:outline-none"
                    >
                      Close
                    </button>
                  </div>
                  <div className="p-4 h-full flex flex-col">
                    <div className="flex-grow">
                      <textarea
                        value={mathContent}
                        onChange={(e) => updateContent(e, "content")}
                        className="w-full h-full resize-none dark:bg-[#232222] p-2 rounded focus:outline-none"
                        placeholder="Enter Math content here..."
                      />
                    </div>
                    {showMacrosTextarea && (
                      <div className="flex-grow">
                        <textarea
                          value={katexMacros}
                          onChange={(e) => updateContent(e, "macros")}
                          className="w-full h-full resize-none border-2 dark:border-neutral-600 dark:bg-[#232222] p-4 rounded focus:outline-none"
                          placeholder="Enter KaTeX macros here..."
                        />
                      </div>
                    )}
                    <button
                      className="mb-12 mt-4 p-3 bg-amber-500 text-white rounded focus:outline-none"
                      onClick={() => setShowMacrosTextarea(!showMacrosTextarea)}
                    >
                      {showMacrosTextarea ? "Hide Macros" : "Show Macros"}
                    </button>
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

export default MathBlock;
