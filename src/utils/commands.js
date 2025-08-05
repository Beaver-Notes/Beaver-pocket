import { useState, useEffect } from "react";
import emitter from "tiny-emitter/instance";
import enTranslations from "@/assets/locales/en.json";
import deTranslations from "@/assets/locales/de.json";


function getModifierKey() {
  return navigator.platform.includes("Mac") ? "Cmd" : "Ctrl";
}

const selectedLanguage = localStorage.getItem("selectedLanguage") || "en";

let translations = enTranslations;
if (selectedLanguage === "en") translations = enTranslations;
if (selectedLanguage === "de") translations = deTranslations;

function useCustomTheme() {
  const [themeMode, setThemeMode] = useState(() => {
    const storedThemeMode = localStorage.getItem("themeMode");
    return storedThemeMode || "auto";
  });

  const [darkMode, setDarkMode] = useState(() => {
    const prefersDarkMode = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    return themeMode === "auto" ? prefersDarkMode : themeMode === "dark";
  });

  // Keep localStorage updated when themeMode changes
  useEffect(() => {
    localStorage.setItem("themeMode", themeMode);
  }, [themeMode]);

  // Optionally sync darkMode state with themeMode
  useEffect(() => {
    if (themeMode === "auto") {
      const prefersDarkMode = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      setDarkMode(prefersDarkMode);
    } else {
      setDarkMode(themeMode === "dark");
    }
  }, [themeMode]);

  const toggleTheme = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    setThemeMode(newDarkMode ? "dark" : "light");
    emitter.emit("close-command-prompt"); // assuming this is your intention for setIsCommandPromptOpen(false)
  };

  const setTheme = (mode) => {
    setThemeMode(mode);
    setDarkMode(mode === "dark");
  };

  return { themeMode, darkMode, toggleTheme, setTheme };
}

function useCommands() {
  const { setTheme, toggleTheme } = useCustomTheme();

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
