import React, { useEffect, useState, useCallback } from "react";
import { UiModal } from "@/components/ui/Modal";
import UiInput from "@/components/ui/Input";
import UiButton from "@/components/ui/Button";
import { useTranslation } from "@/utils/translations";
import emitter from "tiny-emitter/instance";

type DialogType = "" | "prompt" | "auth";
type ButtonVariant = "default" | "primary" | "danger";

export interface DialogOptions {
  html?: boolean;
  body?: string;
  title?: string;
  placeholder?: string;
  label?: string;
  auth?: string[];
  allowedEmpty?: boolean;
  okText?: string;
  okVariant?: ButtonVariant;
  cancelText?: string;
  onConfirm?: (param: any) => boolean | void;
  onCancel?: () => void;
}

const defaultOptions: DialogOptions = {
  html: false,
  body: "",
  title: "",
  placeholder: "",
  label: "",
  auth: [],
  allowedEmpty: true,
  okText: "Confirm",
  okVariant: "primary",
  cancelText: "Cancel",
};

const Dialog: React.FC = () => {
  const [show, setShow] = useState(false);
  const [type, setType] = useState<DialogType>("");
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<DialogOptions>(defaultOptions);
  const [isEmpty, setIsEmpty] = useState(false);
  const [translations, setTranslations] = useState<Record<string, any>>({});

  const loadTranslations = async () => {
    const trans = await useTranslation();
    if (trans) setTranslations(trans);
  };

  useEffect(() => {
    loadTranslations();
  }, []);

  const fireCallback = useCallback(
    (callbackType: "onCancel" | "onConfirm") => {
      const callback = options[callbackType];
      let param: any = true;

      if (type === "prompt") {
        param = input;
      } else if (type === "auth") {
        param = {
          name: input,
        };
      }

      let hide = true;

      if (callbackType !== "onCancel" && !options.allowedEmpty && !input) {
        setIsEmpty(true);
        return;
      }

      if (callback) {
        const cbReturn = callback(param);
        if (typeof cbReturn === "boolean") {
          hide = cbReturn;
        }
      }

      if (hide) {
        setOptions(defaultOptions);
        setShow(false);
        setInput("");
      }
      setIsEmpty(false);
    },
    [input, options, type]
  );

  useEffect(() => {
    const handleDialog = (type: DialogType, opts: DialogOptions) => {
      setType(type);
      const newOptions = { ...defaultOptions, ...opts };
      setOptions(newOptions);
      setShow(true);
      setIsEmpty(false);
    };

    emitter.on("show-dialog", handleDialog);
    return () => {
      emitter.off("show-dialog", handleDialog);
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Enter") {
        fireCallback("onConfirm");
      } else if (e.code === "Escape") {
        fireCallback("onCancel");
      }
    };

    if (show) {
      window.addEventListener("keyup", handler);
    } else {
      window.removeEventListener("keyup", handler);
    }

    return () => window.removeEventListener("keyup", handler);
  }, [show, fireCallback]);

  return (
    <UiModal
      modelValue={show}
      onClose={() => fireCallback("onCancel")}
      contentClass="max-w-sm"
      persist
    >
      <div className="font-semibold text-lg">{options.title}</div>
      <p className="text-neutral-600 dark:text-neutral-200 leading-tight break-words overflow-hidden">
        {options.body}
      </p>

      {type === "prompt" && (
        <div className="w-full mt-4 relative">
          <UiInput
            autofocus
            value={input}
            onChange={(val: string) => setInput(val)}
            placeholder={options.placeholder}
            label={options.label}
            password
          />
        </div>
      )}

      {isEmpty && (
        <div className="text-sm text-red-500 mt-2">
          {translations?.dialog?.inputEmpty}
        </div>
      )}

      <div className="mt-8 flex space-x-2 rtl:space-x-0">
        <UiButton
          className="w-6/12 rtl:ml-2"
          onClick={() => fireCallback("onCancel")}
        >
          {options.cancelText}
        </UiButton>
        <UiButton
          className="w-6/12"
          variant={options.okVariant}
          onClick={() => fireCallback("onConfirm")}
        >
          {options.okText}
        </UiButton>
      </div>
    </UiModal>
  );
};

export default Dialog;
