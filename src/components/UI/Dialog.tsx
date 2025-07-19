import React, { useCallback, useRef, useState, ReactNode } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Transition,
} from "@headlessui/react";
import Icon from "./Icon";

type DialogProps = {
  isOpen: boolean;
  closeDialog: () => void;
  title?: string;
  children: ReactNode;
};

const UIDialog: React.FC<DialogProps> = ({ isOpen, closeDialog, title, children }) => {
  const dialogPanelRef = useRef<HTMLDivElement>(null);
  const [startY, setStartY] = useState(0);
  const [dragging, setDragging] = useState(false);

  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    setStartY(event.touches[0].clientY);
    setDragging(true);
  }, []);

  const handleTouchMove = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      if (!dragging) return;
      const currentY = event.touches[0].clientY;
      const delta = currentY - startY;

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

      if (delta > 100) {
        closeDialog();
      } else {
        dialogPanelRef.current!.style.transition = "transform 0.3s ease";
        dialogPanelRef.current!.style.transform = "translateY(0)";
      }

      setDragging(false);
      setStartY(0);
    },
    [startY, dragging, closeDialog]
  );

  return (
    <Transition show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="fixed inset-0 z-[1000] flex justify-center items-center" onClose={closeDialog}>
        <DialogBackdrop className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" />
        <div className="fixed inset-0 flex items-end sm:items-center pb-6 justify-center">
          <Transition.Child
            as={React.Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <DialogPanel
              ref={dialogPanelRef}
              className="bg-white dark:bg-gray-900 p-6 rounded-2xl w-full max-w-lg mx-4"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{ transition: dragging ? "none" : "transform 0.3s ease" }}
              aria-labelledby="dialog-title"
            >
              <div className="flex justify-between items-center">
                {title && <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>}
                <button onClick={closeDialog} className="text-gray-600 hover:text-black">
                  <Icon name="CloseLine" />
                </button>
              </div>
              <div className="my-2 border-b dark:border-gray-600"></div>
              <div className="mt-4">{children}</div>
            </DialogPanel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
};

export default UIDialog;
