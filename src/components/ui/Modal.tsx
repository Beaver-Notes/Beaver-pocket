import React, { useEffect, useState, ReactNode, useRef } from "react";
import { CSSTransition } from "react-transition-group";
import { createPortal } from "react-dom";
import "./css/modal.scss";
import UiCard from "./Card";
import Icon from "./Icon";

interface UiModalProps {
  modelValue: boolean;
  onClose: (value: boolean) => void;
  teleportTo?: string;
  contentClass?: string;
  customContent?: boolean;
  persist?: boolean;
  blur?: boolean;
  disabledTeleport?: boolean;
  children?: ReactNode;
  header?: ReactNode;
  activator?: (props: { open: () => void }) => ReactNode;
  className?: string;
  allowSwipeToDismiss?: boolean;
}

export const UiModal: React.FC<UiModalProps> = ({
  modelValue,
  onClose,
  teleportTo = "body",
  contentClass = "max-w-lg",
  customContent = false,
  allowSwipeToDismiss = false,
  persist = false,
  blur = false,
  disabledTeleport = false,
  children,
  header,
  activator,
  className,
}) => {
  const [show, setShow] = useState(modelValue);
  const modalContentRef = useRef<HTMLDivElement>(null);
  const [startY, setStartY] = useState(0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    setShow(modelValue);
    document.body.classList.toggle("overflow-hidden", modelValue);
  }, [modelValue]);

  useEffect(() => {
    const handleKeyup = (e: KeyboardEvent) => {
      if (e.code === "Escape") closeModal();
    };

    if (show) {
      window.addEventListener("keyup", handleKeyup);
    } else {
      window.removeEventListener("keyup", handleKeyup);
    }

    return () => {
      window.removeEventListener("keyup", handleKeyup);
    };
  }, [show]);

  const closeModal = () => {
    setShow(false);
    onClose(false);
    document.body.classList.remove("overflow-hidden");
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!allowSwipeToDismiss) return;
    setStartY(e.touches[0].clientY);
    setDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!allowSwipeToDismiss || !dragging) return;
    const currentY = e.touches[0].clientY;
    const delta = currentY - startY;

    if (delta > 0 && modalContentRef.current) {
      modalContentRef.current.style.transform = `translateY(${delta}px)`;
      modalContentRef.current.style.transition = "none";
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!allowSwipeToDismiss || !dragging) return;
    const currentY = e.changedTouches[0].clientY;
    const delta = currentY - startY;

    if (delta > 100) {
      closeModal();
    } else if (modalContentRef.current) {
      modalContentRef.current.style.transition = "transform 0.3s ease";
      modalContentRef.current.style.transform = "translateY(0)";
    }

    setDragging(false);
    setStartY(0);
  };

  const nodeRef = useRef(null);

  const modalContent = (
    <CSSTransition
      in={show}
      timeout={300}
      classNames="modal"
      unmountOnExit
      nodeRef={nodeRef}
      appear
    >
      <div
        ref={nodeRef}
        className={
          className
            ? className
            : `modal-ui__content-container bg-black bg-opacity-20 p-5 overflow-y-auto z-50 fixed top-0 left-0 w-full h-full flex justify-center items-center`
        }
        style={{ backdropFilter: blur ? "blur(2px)" : undefined }}
        onClick={(e) => {
          if (e.target === e.currentTarget) closeModal();
        }}
      >
        {customContent ? (
          children
        ) : (
          <div
            ref={modalContentRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
              transition: dragging ? "none" : undefined,
            }}
            className={`w-full`}
          >
            <UiCard
              className={`modal-ui__content shadow-lg w-full ${contentClass}`}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{
                transition: dragging ? "none" : undefined,
              }}
            >
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <span className="content-header">{header}</span>
                  {!persist && (
                    <button
                      onClick={closeModal}
                      className="text-neutral-600 cursor-pointer"
                    >
                      <Icon name="CloseLine" className="text-2xl" />
                    </button>
                  )}
                </div>
              </div>
              {children}
            </UiCard>
          </div>
        )}
      </div>
    </CSSTransition>
  );

  return (
    <div className="modal-ui">
      {activator && (
        <div className="modal-ui__activator">
          {activator({ open: () => setShow(true) })}
        </div>
      )}
      {disabledTeleport
        ? modalContent
        : teleportTo &&
          typeof document !== "undefined" &&
          createPortal(
            modalContent,
            document.querySelector(teleportTo) as HTMLElement
          )}
    </div>
  );
};
