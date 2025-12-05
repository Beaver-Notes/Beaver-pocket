// Popover.tsx
import React, { useEffect, useRef, useState } from "react";
import Tippy from "@tippyjs/react";

interface PopoverProps {
  placement?: "top" | "bottom" | "left" | "right";
  trigger?: "click" | "mouseenter" | "focus";
  padding?: string;
  to?: string | HTMLElement;
  disabled?: boolean;
  modelValue?: boolean;
  onShow?: () => void;
  onClose?: () => void;
  onTrigger?: () => void;
  /** NEW: prevent the trigger/content from stealing focus (keeps mobile keyboard open) */
  preventBlur?: boolean;
  /** OPTIONAL: called on show to re-focus your editor (e.g. () => editor?.chain().focus().run()) */
  onKeepFocus?: () => void;

  children: React.ReactNode;
  triggerContent: React.ReactNode;
}

const Popover: React.FC<PopoverProps> = ({
  placement = "bottom",
  trigger = "click",
  padding = "p-2",
  disabled = false,
  modelValue = false,
  onShow,
  onClose,
  onTrigger,
  preventBlur = true,
  onKeepFocus,
  children,
  triggerContent,
}) => {
  const [, setIsShow] = useState(modelValue);
  const targetRef = useRef<HTMLElement | null>(null);
  const tippyInstance = useRef<any>(null);

  useEffect(() => {
    if (!tippyInstance.current) return;
    disabled ? tippyInstance.current.disable() : tippyInstance.current.enable();
  }, [disabled]);

  useEffect(() => {
    if (!tippyInstance.current) return;
    modelValue ? tippyInstance.current.show() : tippyInstance.current.hide();
  }, [modelValue]);

  const preventFocusLoss = (e: React.SyntheticEvent) => {
    if (!preventBlur) return;

    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
      return;
    }

    e.preventDefault();
    e.stopPropagation();
  };
  
  return (
    <Tippy
      content={
        <div
          className={`i-popover__content bg-white dark:bg-neutral-800 rounded-lg shadow-xl border ${padding}`}
          onMouseDown={preventFocusLoss}
          onTouchStart={preventFocusLoss}
        >
          {children}
        </div>
      }
      placement={placement}
      trigger={trigger}
      interactive={true}
      hideOnClick={true}
      appendTo={() => document.body}
      role="popover"
      onCreate={(instance) => (tippyInstance.current = instance)}
      onShow={() => {
        setIsShow(true);
        onKeepFocus?.();
        onShow?.();
      }}
      onHide={() => {
        setIsShow(false);
        onClose?.();
      }}
      onTrigger={() => {
        onTrigger?.();
      }}
    >
      <span
        ref={targetRef}
        className="inline-block"
        onMouseDown={preventFocusLoss}
        onTouchStart={preventFocusLoss}
        onPointerDown={preventFocusLoss}
      >
        {triggerContent}
      </span>
    </Tippy>
  );
};

export default Popover;
