import { Link } from "react-router-dom";
import React, { useState, useEffect } from "react";
import enTranslations from "./assets/locales/en.json";
import itTranslations from "./assets/locales/it.json";
import deTranslations from "./assets/locales/de.json";
import Icons from "./lib/remixicon-react";
import { Note } from "./store/types";
import { loadNotes } from "./store/notes";
import { isPlatform } from "@ionic/react";

interface SettingsProps {
  notesState: Record<string, Note>;
  setNotesState: (notes: Record<string, Note>) => void;
}

const Archive: React.FC<SettingsProps> = ({ setNotesState }) => {
  const [selectedFont, setSelectedFont] = useState<string>(
    localStorage.getItem("selected-font") || "Arimo"
  );

  const [selectedCodeFont, setSelectedCodeFont] = useState<string>(
    localStorage.getItem("selected-font-code") || "JetBrains Mono"
  );

  const Codefonts = [
    "Anonymous Pro",
    "Hack",
    "JetBrains Mono",
    "Source Code Pro",
  ];

  const fonts = [
    "Arimo",
    "Avenir",
    "EB Garamond",
    "Helvetica",
    "OpenDyslexic",
    "Roboto Mono",
    "Ubuntu",
  ];

  useEffect(() => {
    document.documentElement.style.setProperty("--selected-font", selectedFont);
    localStorage.setItem("selected-font", selectedFont);
  }, [selectedFont]);

  const updateFont = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedFont(e.target.value);
  };

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--selected-font-code",
      selectedCodeFont
    );
    localStorage.setItem("selected-font-code", selectedCodeFont);
  }, [selectedCodeFont]);

  const updatCodeFont = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCodeFont(e.target.value);
  };

  const [themeMode, setThemeMode] = useState(() => {
    const storedThemeMode = localStorage.getItem("themeMode");
    return storedThemeMode || "auto";
  });

  // State to manage dark mode
  const [darkMode, setDarkMode] = useState(() => {
    const prefersDarkMode = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    return themeMode === "auto" ? prefersDarkMode : themeMode === "dark";
  });

  // Effect to update the classList and localStorage when darkMode or themeMode changes
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("themeMode", themeMode);
  }, [darkMode, themeMode]);

  // Function to toggle dark mode
  const toggleTheme = (
    newMode: boolean | ((prevState: boolean) => boolean)
  ) => {
    setDarkMode(newMode);
    setThemeMode(newMode ? "dark" : "light");
    setSelectedOption(newMode ? "Dark" : "Light");
  };

  // Function to set theme mode to auto based on device preference
  const setAutoMode = () => {
    const prefersDarkMode = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    setDarkMode(prefersDarkMode);
    setThemeMode("auto");
    setSelectedOption("System");
  };

  // Translations
  const [translations, setTranslations] = useState({
    settings: {
      title: "settings.title",
      apptheme: "settings.apptheme",
      light: "settings.light",
      dark: "settings.dark",
      system: "settings.system",
      selectlanguage: "settings.selectlanguage",
      selectfont: "settings.selectfont",
      About: "settings.About",
      Shortcuts: "settings.Shortcuts",
      codeFont: "settings.codeFont",
      interfaceOptions: "settings.interfaceOptions",
      clearFont: "settings.clearFont",
      Sync: "settings.Sync",
      expandPage: "settings.expandPage",
      CollapsibleHeading: "settings.CollapsibleHeading",
      scribbleCompatibility: "settings.scribbleCompatibility",
    },
  });

  const [wd, setwd] = useState<boolean>(
    localStorage.getItem("expand-editor") === "true"
  );

  useEffect(() => {
    setwd(localStorage.getItem("expand-editor") === "true");
  }, []);

  const toggleBackground = () => {
    const newValue = !wd;
    localStorage.setItem("expand-editor", newValue.toString());
    setwd(newValue);
  };

  useEffect(() => {
    // Load translations
    const loadTranslations = async () => {
      const selectedLanguage = localStorage.getItem("selectedLanguage") || "en";
      try {
        const translationModule = await import(
          `./assets/locales/${selectedLanguage}.json`
        );
        setTranslations({ ...translations, ...translationModule.default });
      } catch (error) {
        console.error("Error loading translations:", error);
      }
    };

    loadTranslations();
  }, []); // Empty dependency array means this effect runs once on mount

  const [selectedLanguage, setSelectedLanguage] = useState(
    localStorage.getItem("selectedLanguage") || "en"
  );

  const languages = [
    { code: "en", name: "English", translations: enTranslations },
    { code: "it", name: "Italiano", translations: itTranslations },
    { code: "de", name: "Deutsch", translations: deTranslations },
  ];

  const updateLanguage = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const languageCode = event.target.value;
    setSelectedLanguage(languageCode);
    localStorage.setItem("selectedLanguage", languageCode);
    window.location.reload(); // Reload the page
  };

  const [ClearFontChecked, setClearFontChecked] = useState(
    localStorage.getItem("selected-dark-text") === "#CCCCCC"
  );

  const toggleClearFont = () => {
    const newValue = !ClearFontChecked;
    setClearFontChecked(newValue);
    localStorage.setItem("selected-dark-text", newValue ? "#CCCCCC" : "white");
    document.documentElement.style.setProperty(
      "selected-dark-text",
      newValue ? "#CCCCCC" : "white"
    );
    window.location.reload();
  };

  const [collapsibleHeading, setCollapsibleHeading] = useState(() => {
    const storedValue = localStorage.getItem("collapsibleHeading");
    return storedValue === "true"; // Convert stored string to boolean
  });

  // Function to toggle collapsibleHeading
  const toggleCollapsibleHeading = async () => {
    // Toggle collapsibleHeading synchronously
    setCollapsibleHeading((prevValue) => {
      const newValue = !prevValue;
      localStorage.setItem("collapsibleHeading", newValue.toString()); // Store as string
      return newValue;
    });
    // Load notes asynchronously
    const notes = await loadNotes();
    setNotesState(notes);
  };

  const [scribbleCompatibility, setScribbleCompatibility] = useState(() => {
    const storedValue = localStorage.getItem("scribbleCompatibility");
    return storedValue !== null ? storedValue === "true" : true; // Default to true
  });

  const toggleScribbleCompatibility = async () => {
    setScribbleCompatibility((prevValue) => {
      const newValue = !prevValue;
      localStorage.setItem("scribbleCompatibility", newValue.toString());
      return newValue;
    });
  };
  
  const [selectedOption, setSelectedOption] = useState(
    themeMode === "auto" ? "System" : darkMode ? "Dark" : "Light"
  );

  const handleChangeMode = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedOption(event.target.value);
    switch (event.target.value) {
      case translations.settings.light:
        toggleTheme(false);
        break;
      case translations.settings.dark:
        toggleTheme(true);
        break;
      case translations.settings.system:
        setAutoMode();
        break;
      default:
        break;
    }
  };

  const modes = [
    translations.settings.light,
    translations.settings.dark,
    translations.settings.system,
  ];

  return (
    <div>
      <div className="grid sm:grid-cols-[auto]">
        <div className="overflow-y-hidden mb-12">
          <div className="py-2 w-full flex flex-col border-neutral-300 overflow-auto">
            <div className="mx-6 md:px-24 pb-8 overflow-y-auto flex-grow">
              <section>
                <p className="text-4xl font-bold text-neutral-800 dark:text-[color:var(--selected-dark-text)]">
                  {" "}
                  {translations.settings.title || "-"}
                </p>
              </section>
              {/* App Theme */}
              <section>
                <p className="text-xl py-2 text-neutral-700 dark:text-[color:var(--selected-dark-text)]">
                  {translations.settings.apptheme || "-"}
                </p>
                <div className="relative">
                  <select
                    value={selectedOption}
                    onChange={handleChangeMode}
                    className="rounded-full w-full p-3 text-neutral-800 bg-[#F8F8F7] dark:bg-[#2D2C2C] dark:text-[color:var(--selected-dark-text)] outline-none appearance-none"
                  >
                    {modes.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </select>
                  <Icons.ArrowDownSLineIcon className="dark:text-[color:var(--selected-dark-text)] ri-arrow-down-s-line absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-600 pointer-events-none" />
                </div>
              </section>
              {/* Select Font */}
              <section>
                <p className="text-xl py-2 text-neutral-700 dark:text-[color:var(--selected-dark-text)]">
                  {translations.settings.selectfont || "-"}
                </p>
                <div className="relative">
                  <select
                    value={selectedFont}
                    onChange={updateFont}
                    className="rounded-full w-full p-3 text-neutral-800 bg-[#F8F8F7] dark:bg-[#2D2C2C] dark:text-[color:var(--selected-dark-text)] outline-none appearance-none"
                  >
                    {fonts.map((font) => (
                      <option key={font} value={font}>
                        {font}
                      </option>
                    ))}
                  </select>
                  <Icons.ArrowDownSLineIcon className="dark:text-[color:var(--selected-dark-text)] ri-arrow-down-s-line absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-600 pointer-events-none" />
                </div>
              </section>
              {/* Code Font */}
              <section>
                <p className="text-xl py-2 text-neutral-700 dark:text-[color:var(--selected-dark-text)]">
                  {translations.settings.codeFont || "-"}
                </p>
                <div className="relative">
                  <select
                    value={selectedCodeFont}
                    onChange={updatCodeFont}
                    className="rounded-full w-full p-3 text-neutral-800 bg-[#F8F8F7] dark:bg-[#2D2C2C] dark:text-[color:var(--selected-dark-text)] outline-none appearance-none"
                  >
                    {Codefonts.map((Codefonts) => (
                      <option key={Codefonts} value={Codefonts}>
                        {Codefonts}
                      </option>
                    ))}
                  </select>
                  <Icons.ArrowDownSLineIcon className="dark:text-[color:var(--selected-dark-text)] ri-arrow-down-s-line absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-600 pointer-events-none" />
                </div>
              </section>
              {/* Select Language */}
              <section>
                <p className="text-xl py-2 text-neutral-700 dark:text-[color:var(--selected-dark-text)]">
                  {translations.settings.selectlanguage || "-"}
                </p>
                <div className="relative">
                  <select
                    value={selectedLanguage}
                    onChange={updateLanguage}
                    className="rounded-full w-full p-3 text-neutral-800 bg-[#F8F8F7] dark:bg-[#2D2C2C] dark:text-[color:var(--selected-dark-text)] outline-none appearance-none"
                  >
                    {languages.map((language) => (
                      <option key={language.code} value={language.code}>
                        {language.name}
                      </option>
                    ))}
                  </select>
                  <Icons.ArrowDownSLineIcon className="dark:text-[color:var(--selected-dark-text)] ri-arrow-down-s-line absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-600 pointer-events-none" />
                </div>
              </section>
              <section className="py-2">
                {/* Interface Options */}
                <p className="text-xl py-4 text-neutral-700 dark:text-[color:var(--selected-dark-text)]">
                  {translations.settings.interfaceOptions || "-"}
                </p>
                <div className="hidden sm:block">
                  <div className="flex items-center py-2 dark:border-neutral-600 justify-between">
                    <div>
                      <p className="block text-lg align-left">
                        {" "}
                        {translations.settings.expandPage || "-"}
                      </p>
                    </div>
                    <label className="relative inline-flex cursor-pointer items-center">
                      <input
                        id="switch"
                        type="checkbox"
                        checked={wd}
                        onChange={toggleBackground}
                        className="peer sr-only"
                      />
                      <div className="peer h-8 w-[3.75rem] rounded-full border dark:border-[#353333] dark:bg-[#353333] after:absolute after:left-[2px] rtl:after:right-[22px] after:top-0.5 after:h-7 after:w-7 after:rounded-full after:border after:border-neutral-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-amber-400 peer-checked:after:translate-x-full rtl:peer-checked:after:border-white peer-focus:ring-green-300"></div>
                    </label>
                  </div>
                </div>
                <div className="flex items-center py-2 dark:border-neutral-600 justify-between">
                  <div>
                    <p className="block text-lg align-left">
                      {" "}
                      {translations.settings.clearFont || "-"}
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      id="switch"
                      type="checkbox"
                      checked={ClearFontChecked}
                      onChange={toggleClearFont}
                      className="peer sr-only"
                    />
                    <div className="peer h-8 w-[3.75rem] rounded-full border dark:border-[#353333] dark:bg-[#353333] after:absolute after:left-[2px] rtl:after:right-[22px] after:top-0.5 after:h-7 after:w-7 after:rounded-full after:border after:border-neutral-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-amber-400 peer-checked:after:translate-x-full rtl:peer-checked:after:border-white peer-focus:ring-green-300"></div>
                  </label>
                </div>
                <div className="flex items-center py-2 dark:border-neutral-600 justify-between">
                  <div>
                    <p className="block text-lg align-left">
                      {translations.settings.CollapsibleHeading || "-"}
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      id="switch"
                      type="checkbox"
                      checked={collapsibleHeading}
                      onChange={toggleCollapsibleHeading}
                      className="peer sr-only"
                    />
                    <div className="peer h-8 w-[3.75rem] rounded-full border dark:border-[#353333] dark:bg-[#353333] after:absolute after:left-[2px] rtl:after:right-[22px] after:top-0.5 after:h-7 after:w-7 after:rounded-full after:border after:border-neutral-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-amber-400 peer-checked:after:translate-x-full rtl:peer-checked:after:border-white peer-focus:ring-green-300"></div>
                  </label>
                </div>
                <div
                  className={`flex items-center py-2 dark:border-neutral-600 justify-between ${
                    isPlatform("ipad") ? "show" : "hide"
                  }`}
                >
                  <div>
                    <p className="block text-lg align-left">
                      {translations.settings.scribbleCompatibility || "-"}
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      id="switch"
                      type="checkbox"
                      checked={scribbleCompatibility}
                      onChange={toggleScribbleCompatibility}
                      className="peer sr-only"
                    />
                    <div className="peer h-8 w-[3.75rem] rounded-full border dark:border-[#353333] dark:bg-[#353333] after:absolute after:left-[2px] rtl:after:right-[22px] after:top-0.5 after:h-7 after:w-7 after:rounded-full after:border after:border-neutral-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-amber-400 peer-checked:after:translate-x-full rtl:peer-checked:after:border-white peer-focus:ring-green-300"></div>
                  </label>
                </div>
              </section>
              <div className="pb-4">
                <div className="flex flex-col gap-2 pt-2">
                  <Link
                    to="/Sync"
                    className="w-full p-4 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl inline-flex items-center"
                  >
                    <Icons.SyncLineIcon className="w-6 h-6 mr-2" />
                    {translations.settings.Sync || "-"}
                  </Link>
                  <Link
                    to="/about"
                    className="w-full p-4 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl inline-flex items-center"
                  >
                    <Icons.InformationLineIcon className="w-6 h-6 mr-2" />
                    {translations.settings.About || "-"}
                  </Link>
                  <Link
                    to="/shortcuts"
                    className="w-full p-4 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl inline-flex items-center"
                  >
                    <Icons.KeyboardLineIcon className="w-6 h-6 mr-2" />
                    {translations.settings.Shortcuts || "-"}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Archive;
