import { useState, useEffect } from "react";
import { useTheme } from "../composable/theme";
import emitter from "tiny-emitter/instance";
import { Preferences } from "@capacitor/preferences";
import enTranslations from "@/assets/locales/en.json";
import deTranslations from "@/assets/locales/de.json";

function getModifierKey() {
  return navigator.platform.includes("Mac") ? "Cmd" : "Ctrl";
}

let translations = enTranslations;

async function initializeCommand() {
  async function loadTranslations() {
    const { value } = await Preferences.get({ key: "selectedLanguage" });
    if (value === "de") {
      translations = deTranslations;
    }
  }

  await loadTranslations();
}

initializeCommand();

function useCommands() {
  const { setTheme } = useTheme();

  const commands = [
    {
      id: "new-note",
      title: translations.commands.newNote,
      shortcut: [getModifierKey(), "N"],
      handler: () => emitter.emit("new-note"),
    },
    {
      id: "settings",
      title: translations.commands.settings,
      shortcut: [getModifierKey(), ","],
      handler: () => emitter.emit("open-settings"),
    },
    {
      id: "dark-theme",
      title: translations.commands.darkTheme,
      handler: () => setTheme("dark"),
    },
    {
      id: "light-theme",
      title: translations.commands.lightTheme,
      handler: () => setTheme("light"),
    },
  ];

  return commands;
}

export default useCommands;
