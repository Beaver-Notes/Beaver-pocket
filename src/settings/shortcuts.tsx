import React, { useState, useEffect } from "react";

const Shortcuts: React.FC = () => {
  // Translations
  const [translations, setTranslations] = useState({
    settings: {
      title: "settings.title",
    },
    shortcuts: {
      Createnewnote: "shortcuts.Createnewnote",
      Toggledarktheme: "shortcuts.Toggledarktheme",
      Tonotes: "shortcuts.Tonotes",
      Toarchivednotes: "shortcuts.ToarchivedNotes",
      Tosettings: "shortcuts.Tosettings",
      Bold: "shortcuts.Bold",
      Italic: "shortcuts.Italic",
      Underline: "shortcuts.Underline",
      Link: "shortcuts.Link",
      Strikethrough: "shortcuts.Strikethrough",
      Highlight: "shortcuts.Highlight",
      Inlinecode: "shortcuts.InlineCode",
      Headings: "shortcuts.Headings",
      Orderedlist: "shortcuts.OrderedList",
      Bulletlist: "shortcuts.Bulletlist",
      Blockquote: "shortcuts.Blockquote",
      Blockcode: "shortcuts.BlockCode",
      General: "shortcuts.General",
      Navigates: "shortcuts.Navigates",
      Editor: "shortcuts.Editor",
    },
  });

  useEffect(() => {
    // Load translations
    const loadTranslations = async () => {
      const selectedLanguage = localStorage.getItem("selectedLanguage") || "en";
      try {
        const translationModule = await import(
          `../assets/locales/${selectedLanguage}.json`
        );

        setTranslations({ ...translations, ...translationModule.default });
      } catch (error) {
        console.error("Error loading translations:", error);
      }
    };

    loadTranslations();
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
                <div className="rounded-lg bg-gray-800 bg-opacity-5 dark:bg-gray-200 dark:bg-opacity-5">
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
