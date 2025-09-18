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
import Icon from "@/components/ui/Icon";
import { useTranslation } from "@/utils/translations";

interface MathBlockProps extends NodeViewWrapperProps {
  updateAttributes: (attributes: Record<string, any>) => void;
}

const MathBlock: React.FC<MathBlockProps> = (props) => {
  const [showModal, setShowModal] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [showSecondTextarea, setShowSecondTextarea] = useState(false);
  const [translations, setTranslations] = useState<Record<string, any>>({
    editor: {},
    accessibility: {},
  });
  const dialogPanelRef = useRef<HTMLDivElement>(null);

  // Render KaTeX
  const renderContent = () => {
    let macros = {};
    try {
      macros = JSON.parse(props.node.attrs.macros || "{}");
    } catch (e) {
      console.error("Error parsing macros:", e);
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

  // Modal handlers
  const handleContentClick = () => setShowModal(true);
  const closeModal = useCallback(() => setShowModal(false), []);

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
      if (delta > 0)
        dialogPanelRef.current!.style.transform = `translateY(${delta}px)`;
    },
    [startY, dragging]
  );

  const handleTouchEnd = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (!dragging) return;
      const delta = event.changedTouches[0].clientY - startY;

      if (delta > 200) closeModal();
      else {
        dialogPanelRef.current!.style.transition = "transform 0.3s ease";
        dialogPanelRef.current!.style.transform = "translateY(0)";
      }

      setDragging(false);
      setStartY(0);
    },
    [startY, dragging, closeModal]
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

      {/* Modal */}
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
                className="relative w-full landscape:w-2/4 portrait:w-5/5 sm:w-3/5 sm:h-3/4 mt-32 sm:mt-12 h-full bg-white dark:bg-neutral-800 rounded-xl shadow-xl overflow-hidden"
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
                    {translations.editor.editContent || "-"}
                  </DialogTitle>
                  <div className="flex space-x-4">
                    <button
                      title="Toggle KaTeX Macros"
                      aria-label={
                        showSecondTextarea
                          ? translations.accessibility.disableKatex
                          : translations.accessibility.enableKatex
                      }
                      className={`cursor-pointer ${
                        showSecondTextarea
                          ? "text-primary"
                          : "text-neutral-800 dark:text-white"
                      }`}
                      onClick={toggleSecondTextarea}
                    >
                      <Settings4LineIcon aria-hidden="true" />
                    </button>
                    <button
                      onClick={closeModal}
                      className="text-neutral-800 dark:text-[color:var(--selected-dark-text)] bg-neutral-200 rounded-full hover:text-gray-700 focus:outline-none"
                      aria-label={translations.accessibility.close}
                    >
                      <Icon name="CloseLine" />
                    </button>
                  </div>
                </div>

                <div className="p-4 h-[80vh] flex flex-col">
                  <div className="flex-grow">
                    <textarea
                      id="content-textarea"
                      value={props.node.attrs.content}
                      onChange={(e) => updateContent(e, "content")}
                      className="w-full h-full resize-none dark:bg-neutral-800 p-2 rounded focus:outline-none"
                      placeholder={translations.editor.mathContent || "-"}
                    />
                  </div>
                  {showSecondTextarea && (
                    <div className="flex-grow">
                      <textarea
                        id="macros-textarea"
                        value={props.node.attrs.macros}
                        onChange={(e) => updateContent(e, "macros")}
                        className="w-full h-full resize-none bg-neutral-50 dark:bg-neutral-900 p-2 rounded-lg focus:outline-none"
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
