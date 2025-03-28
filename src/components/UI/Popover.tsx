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
  children: React.ReactNode;
  triggerContent: React.ReactNode;
}

const Popover: React.FC<PopoverProps> = ({
  placement = "bottom",
  trigger = "click",
  padding = "p-4",
  disabled = false,
  modelValue = false,
  onShow,
  onClose,
  onTrigger,
  children,
  triggerContent,
}) => {
  const [, setIsShow] = useState(modelValue);
  const targetRef = useRef<HTMLElement | null>(null);
  const tippyInstance = useRef<any>(null);

  useEffect(() => {
    if (tippyInstance.current) {
      if (disabled) {
        tippyInstance.current.disable();
      } else {
        tippyInstance.current.enable();
      }
    }
  }, [disabled]);

  useEffect(() => {
    if (tippyInstance.current) {
      if (modelValue) {
        tippyInstance.current.show();
      } else {
        tippyInstance.current.hide();
      }
    }
  }, [modelValue]);

  return (
    <Tippy
      content={
        <div
          className={`i-popover__content bg-white dark:bg-neutral-800 rounded-lg shadow-xl border dark:border-neutral-700 ${padding}`}
        >
          {children}
        </div>
      }
      placement={placement}
      trigger={trigger}
      interactive={true}
      onShow={() => {
        setIsShow(true);
        onShow && onShow();
      }}
      onHide={() => {
        setIsShow(false);
        onClose && onClose();
      }}
      onTrigger={() => {
        onTrigger && onTrigger();
      }}
      appendTo={() => document.body}
      role="popover"
      onCreate={(instance) => (tippyInstance.current = instance)}
    >
      <span ref={targetRef} className="inline-block">
        {triggerContent}
      </span>
    </Tippy>
  );
};

export default Popover;
