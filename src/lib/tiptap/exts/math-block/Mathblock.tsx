import React, { useEffect, useRef, useState } from "react";
import { NodeViewWrapperProps, NodeViewWrapper } from "@tiptap/react";
import Settings4LineIcon from "remixicon-react/Settings4LineIcon";
import katex from "katex";
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle, Transition } from '@headlessui/react';

interface MathBlockProps extends NodeViewWrapperProps {
  updateAttributes: (attributes: Record<string, any>) => void;
}

const MathBlock: React.FC<MathBlockProps> = (props) => {
  const contentRef = useRef<HTMLParagraphElement>(null);
  const [useKatexMacros] = useState(false);
  const [isContentChange, setIsContentChange] = useState(false);
  const [showSecondTextarea, setShowSecondTextarea] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const dialogPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    props.updateAttributes({ init: "true" });
    renderContent();
  }, []);

  const renderContent = () => {
    let macros = {};

    try {
      macros = JSON.parse(props.node.attrs.macros);
    } catch (error) {
      // Do nothing
    }

    const mathContent = props.node.attrs.content || "Empty";

    const mathML = katex.renderToString(mathContent, {
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
    key: string,
    isRenderContent: boolean
  ) => {
    setIsContentChange(true);
    props.updateAttributes({ [key]: event.target.value });

    if (isRenderContent) renderContent();
  };

  const handleContentClick = () => {
    setShowModal(true);
  };

  const toggleSecondTextarea = () => {
    setShowSecondTextarea(!showSecondTextarea);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  return (
    <NodeViewWrapper className="math-block-node-view">
      <div onClick={handleContentClick}>
        <p
          ref={contentRef}
          contentEditable={useKatexMacros}
          suppressContentEditableWarning
          className={`${
            isContentChange ? "dark:text-purple-400 text-purple-500" : ""
          }`}
        ></p>
      </div>
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
                      value={props.node.attrs.content}
                      onChange={(e) => updateContent(e, "content", true)}
                      className="w-full h-full resize-none dark:bg-[#232222] p-2 rounded focus:outline-none"
                      placeholder="Enter Math content here..."
                    />
                  </div>
                  {showSecondTextarea && (
                    <div className="mt-4 flex-grow">
                      <textarea
                        value={props.node.attrs.macros}
                        onChange={(e) => updateContent(e, "macros", true)}
                        className="w-full h-full resize-none dark:bg-[#232222] p-2 rounded focus:outline-none"
                        placeholder="Enter KaTeX macros here..."
                      />
                    </div>
                  )}
                  <div className="flex justify-between items-center border-t dark:border-neutral-600 border-neutral-200 pt-2 text-gray-600 dark:text-gray-300">
                    <p className="text-sm" style={{ margin: 0 }}>
                      Press <strong>Enter</strong> to exit
                    </p>
                    <button
                      title="Toggle KaTeX Macros"
                      className={`riSettings3Line cursor-pointer ${
                        useKatexMacros ? "text-primary" : ""
                      } ${showSecondTextarea ? "text-amber-400" : "text-neutral-800 dark:text-white"}`}
                      onClick={toggleSecondTextarea}
                    >
                      <Settings4LineIcon className="active:text-amber-500" />
                    </button>
                  </div>
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
