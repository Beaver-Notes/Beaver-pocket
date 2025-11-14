import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Mousetrap from "mousetrap";

interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  shortcuts?: Record<string, () => void>;
  leftButton?: React.ReactNode; // optional button on the left
  rightButton?: React.ReactNode; // optional button on the right
}

export default function Sheet({
  isOpen,
  onClose,
  title,
  children,
  shortcuts,
  leftButton,
  rightButton,
}: SheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(isOpen);
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const translateYRef = useRef(0);

  // Open/close visibility
  useEffect(() => {
    if (isOpen) setVisible(true);
  }, [isOpen]);

  const handleTransitionEnd = () => {
    if (!isOpen) setVisible(false);
    if (sheetRef.current) sheetRef.current.style.transition = "";
  };

  // Focus trap & Escape
  useEffect(() => {
    if (!isOpen || !sheetRef.current) return;

    const focusableSelectors = [
      "a[href]",
      "button:not([disabled])",
      "textarea:not([disabled])",
      'input[type="text"]:not([disabled])',
      'input[type="radio"]:not([disabled])',
      'input[type="checkbox"]:not([disabled])',
      "select:not([disabled])",
      '[tabindex]:not([tabindex="-1"])',
    ];

    const focusableEls = sheetRef.current.querySelectorAll(
      focusableSelectors.join(",")
    );
    if (focusableEls.length > 0) (focusableEls[0] as HTMLElement).focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (!sheetRef.current) return;
      if (e.key === "Escape") onClose();

      if (e.key === "Tab") {
        const els = sheetRef.current.querySelectorAll(
          focusableSelectors.join(",")
        );
        if (els.length === 0) return;
        const first = els[0] as HTMLElement;
        const last = els[els.length - 1] as HTMLElement;

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Mousetrap shortcuts
  useEffect(() => {
    if (!shortcuts) return;

    Object.entries(shortcuts).forEach(([keyCombo, callback]) => {
      Mousetrap.bind(keyCombo, callback);
    });

    return () => {
      Object.keys(shortcuts).forEach((keyCombo) => Mousetrap.unbind(keyCombo));
    };
  }, [shortcuts]);

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    draggingRef.current = true;
    startYRef.current = e.touches[0].clientY;
    if (sheetRef.current) sheetRef.current.style.transition = ""; // disable transition while dragging
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!draggingRef.current) return;
    const delta = e.touches[0].clientY - startYRef.current;
    if (delta > 0) {
      translateYRef.current = delta;
      if (sheetRef.current)
        sheetRef.current.style.transform = `translateY(${delta}px)`;
    }
  };

  const handleTouchEnd = () => {
    if (!draggingRef.current) return;

    if (translateYRef.current > 120) {
      if (sheetRef.current) {
        sheetRef.current.style.transition = "transform 0.3s ease-out";
        sheetRef.current.style.transform = `translateY(100%)`;
      }
      setTimeout(onClose, 300);
    } else {
      if (sheetRef.current) {
        sheetRef.current.style.transition = "transform 0.3s ease-out";
        sheetRef.current.style.transform = "translateY(0)";
      }
    }

    translateYRef.current = 0;
    draggingRef.current = false;
  };

  if (!visible) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`z-[900] fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div className="z-[999] fixed inset-0 flex items-end justify-center pointer-events-none">
        <div
          ref={sheetRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? "sheet-title" : undefined}
          className="pointer-events-auto w-full max-w-lg bg-white dark:bg-neutral-900 rounded-t-2xl shadow-xl"
          style={{
            transform: isOpen ? "translateY(0)" : "translateY(100%)",
            transition: "transform 0.3s ease-out",
            touchAction: "none",
          }}
          onTransitionEnd={handleTransitionEnd}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Drag handle */}
          <div className="w-12 h-1.5 bg-gray-300 dark:bg-neutral-700 rounded-full mx-auto my-2" />

          {/* Title Bar */}
          {title && (
            <div className="flex items-center justify-between px-4 mb-4">
              {/* Left Button */}
              <div className="flex-shrink-0">
                {leftButton || <div className="w-6" />}
              </div>

              {/* Title */}
              <h2
                id="sheet-title"
                className="text-lg font-semibold text-center flex-1"
              >
                {title}
              </h2>

              {/* Right Button */}
              <div className="flex-shrink-0">
                {rightButton || <div className="w-6" />}
              </div>
            </div>
          )}

          {/* Content */}
          <div className="p-4">{children}</div>
        </div>
      </div>
    </>,
    document.body
  );
}
