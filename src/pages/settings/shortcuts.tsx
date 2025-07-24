import { useTranslation } from "@/utils/translations";
import React, { useState, useEffect } from "react";

const Shortcuts: React.FC = () => {
  const [translations, setTranslations] = useState<Record<string, any>>({
    shortcuts: {},
    settings: {},
  });

  useEffect(() => {
    const fetchTranslations = async () => {
      const trans = await useTranslation();
      if (trans) {
        setTranslations(trans);
      }
    };
    fetchTranslations();
  }, []);

  const shortcuts = [
    {
      title: translations.shortcuts.General,
      items: [
        { name: translations.shortcuts.Createnewnote, keys: ["Ctrl", "N"] },
        {
          name: translations.shortcuts.Toggledarktheme,
          keys: ["Ctrl", "Shift", "L"],
        },
      ],
    },
    {
      title: translations.shortcuts.Navigates,
      items: [
        { name: translations.shortcuts.Tonotes, keys: ["Ctrl", "Shift", "N"] },
        {
          name: translations.shortcuts.Toarchivednotes,
          keys: ["Ctrl", "Shift", "A"],
        },
        { name: translations.shortcuts.Tosettings, keys: ["Ctrl", ","] },
      ],
    },
    {
      title: translations.shortcuts.Editor,
      items: [
        { name: translations.shortcuts.Bold, keys: ["Ctrl", "B"] },
        { name: translations.shortcuts.Italic, keys: ["Ctrl", "I"] },
        { name: translations.shortcuts.Underline, keys: ["Ctrl", "U"] },
        { name: translations.shortcuts.Link, keys: ["Ctrl", "K"] },
        {
          name: translations.shortcuts.Strikethrough,
          keys: ["Ctrl", "Shift", "X"],
        },
        {
          name: translations.shortcuts.Highlight,
          keys: ["Ctrl", "Shift", "E"],
        },
        { name: translations.shortcuts.Inlinecode, keys: ["Ctrl", "E"] },
        {
          name: translations.shortcuts.Headings,
          keys: ["Ctrl", "Alt", "(1-6)"],
        },
        {
          name: translations.shortcuts.Orderedlist,
          keys: ["Ctrl", "Shift", "7"],
        },
        {
          name: translations.shortcuts.Bulletlist,
          keys: ["Ctrl", "Shift", "8"],
        },
        {
          name: translations.shortcuts.Blockquote,
          keys: ["Ctrl", "Shift", "B"],
        },
        { name: translations.shortcuts.Blockcode, keys: ["Ctrl", "Alt", "C"] },
      ],
    },
  ];

  const [themeMode] = useState(() => {
    const storedThemeMode = localStorage.getItem("themeMode");
    return storedThemeMode || "auto";
  });

  const [darkMode] = useState(() => {
    const prefersDarkMode = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    return themeMode === "auto" ? prefersDarkMode : themeMode === "dark";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("themeMode", themeMode);
  }, [darkMode, themeMode]);

  return (
    <div>
      <div className="overflow-y-hidden mb-24">
        <div className="mx-6 sm:px-20 mb-2">
          <div className="general py-2 space-y-8 w-full">
            <p className="text-4xl font-bold">{translations.settings.title}</p>
            {shortcuts.map((shortcut) => (
              <section key={shortcut.title}>
                <p className="mb-2">{shortcut.title}</p>
                <div className="rounded-lg bg-neutral-800 bg-opacity-5 dark:bg-neutral-200 dark:bg-opacity-5">
                  {shortcut.items.map((item) => (
                    <div key={item.name} className="flex items-center p-3">
                      <p className="flex-1">{item.name}</p>
                      {item.keys.map((key) => (
                        <kbd
                          key={key}
                          className="mr-1 border-2 dark:border-neutral-700 rounded-lg p-1 px-2"
                        >
                          {key}
                        </kbd>
                      ))}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
        <div></div>
      </div>
    </div>
  );
};

export default Shortcuts;
