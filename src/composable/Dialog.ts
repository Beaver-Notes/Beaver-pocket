import emitter from "tiny-emitter/instance";
import type { DialogOptions } from "@/components/UI/Dialog";

type DialogType = "confirm" | "prompt" | "auth";

interface UseDialog {
  prompt: (options: DialogOptions) => void;
  confirm: (options: DialogOptions) => void;
  auth: (options: DialogOptions) => void;
}

export function useDialog(): UseDialog {
  function show(type: DialogType, options: DialogOptions) {
    emitter.emit("show-dialog", type, options);
  }

  return {
    prompt: (options) => show("prompt", options),
    confirm: (options) => show("confirm", options),
    auth: (options) => show("auth", options),
  };
}
