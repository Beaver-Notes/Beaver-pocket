import React, { useCallback, useEffect, useRef, useState } from "react";
import { NodeViewWrapperProps, NodeViewWrapper } from "@tiptap/react";
import Settings4LineIcon from "remixicon-react/Settings4LineIcon";
import katex from "katex";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Transition,
} from "@headlessui/react";

interface MathBlockProps extends NodeViewWrapperProps {
  updateAttributes: (attributes: Record<string, any>) => void;
}

const MathBlock: React.FC<MathBlockProps> = (props) => {
  const contentRef = useRef<HTMLParagraphElement>(null);
  const [useKatexMacros] = useState(false);
  const [showSecondTextarea, setShowSecondTextarea] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const dialogPanelRef = useRef<HTMLDivElement>(null);

  // Render content whenever content or macros change
  useEffect(() => {
    renderContent();
  }, [props.node.attrs.content, props.node.attrs.macros]);

  const renderContent = () => {
    let macros = {};
  
    try {
      macros = JSON.parse(props.node.attrs.macros || "{}");
    } catch (error) {
      console.error("Error parsing macros:", error);
    }
  
    const mathContent = props.node.attrs.content || "Empty";
  
    // Automatically wrap in aligned environment for line breaks
    const processedContent = `
      \\begin{aligned}
      ${mathContent.replace(/\\\\/g, "\\\\")}
      \\end{aligned}
    `;
  
    const mathML = katex.renderToString(processedContent, {
      macros,
      displayMode: true,
      throwOnError: false,
      output: "mathml",
    });
  
    if (contentRef.current) {
      contentRef.current.innerHTML = mathML;
    }
  };
  

  const updateContent = (
    event: React.ChangeEvent<HTMLTextAreaElement>,
    key: string
  ) => {
    props.updateAttributes({ [key]: event.target.value });
  };

  const handleContentClick = () => {
    setShowModal(true);
  };

  const toggleSecondTextarea = () => {
    setShowSecondTextarea(!showSecondTextarea);
  };

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

  const [translations, setTranslations] = useState({
    editor: {
      mermaidContent: "editor.mermaidContent",
      editContent: "editor.editContent",
      close: "editor.console",
      mathContent: "editor.mathContent",
      katexMacros: "editor.katexMacros",
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

  return (
    <NodeViewWrapper className="math-block-node-view">
      <div onClick={handleContentClick}>
        <p
          ref={contentRef}
          contentEditable={useKatexMacros}
          suppressContentEditableWarning
          className="break-words whitespace-pre-wrap"
        />
      </div>
      <Transition show={showModal} as={React.Fragment}>
        <Dialog
          open={showModal}
          onClose={closeModal}
          className="fixed inset-0 z-50 overflow-y-auto"
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
                className="relative w-full landscape:w-2/4 portrait:w-4/5 sm:w-3/5 sm:h-3/4 mt-32 sm:mt-12 h-full bg-white dark:bg-[#232222] rounded-xl shadow-xl overflow-hidden"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{
                  transition: dragging ? "none" : "transform 0.3s ease",
                }}
              >
                <div className="flex justify-between items-center bg-gray-100 dark:bg-[#2D2C2C] px-4 py-3">
                  <DialogTitle as="h3" className="text-lg font-semibold">
                    {translations.editor.editContent || "-"}
                  </DialogTitle>
                  <div className="flex space-x-4">
                    <button
                      title="Toggle KaTeX Macros"
                      className={`cursor-pointer ${
                        useKatexMacros ? "text-primary" : ""
                      } ${
                        showSecondTextarea
                          ? "text-amber-400"
                          : "text-neutral-800 dark:text-white"
                      }`}
                      onClick={toggleSecondTextarea}
                    >
                      <Settings4LineIcon className="active:text-amber-500" />
                    </button>
                    <button
                      onClick={closeModal}
                      className="text-amber-400 hover:text-gray-700 focus:outline-none"
                    >
                      {translations.editor.close || "-"}
                    </button>
                  </div>
                </div>

                <div className="p-4 h-[80vh] flex flex-col">
                  <div className="flex-grow">
                    <textarea
                      value={props.node.attrs.content}
                      onChange={(e) => updateContent(e, "content")}
                      className="w-full h-full resize-none dark:bg-[#232222] p-2 rounded focus:outline-none"
                      placeholder={translations.editor.mathContent || "-"}
                    />
                  </div>
                  {showSecondTextarea && (
                    <div className="flex-grow">
                      <textarea
                        value={props.node.attrs.macros}
                        onChange={(e) => updateContent(e, "macros")}
                        className="w-full h-full resize-none dark:bg-[#232222] p-2 rounded focus:outline-none"
                        placeholder={translations.editor.katexMacros || "-"}
                      />
                    </div>
                  )}
                </div>
              </DialogPanel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </NodeViewWrapper>
  );
};

export default MathBlock;
