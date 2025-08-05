import React, { useState, useEffect } from "react";
import enTranslations from "./assets/locales/en.json";
import deTranslations from "./assets/locales/de.json";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "./utils/translations";
import Icon from "./components/ui/Icon";

interface SettingsProps {
  themeMode: string;
  setThemeMode: (mode: any) => void;
  toggleTheme: (newMode: boolean | ((prevState: boolean) => boolean)) => void;
  setAutoMode: () => void;
  darkMode: boolean;
}

const Settings: React.FC<SettingsProps> = ({
  themeMode,
  darkMode,
  toggleTheme,
  setAutoMode,
}) => {
  const navigate = useNavigate();
  const [translations, setTranslations] = useState<Record<string, any>>({
    settings: {},
  });
  const [selectedFont, setSelectedFont] = useState<string>(
    localStorage.getItem("selected-font") || "Arimo"
  );
  const [selectedCodeFont, setSelectedCodeFont] = useState<string>(
    localStorage.getItem("selected-font-code") || "JetBrains Mono"
  );
  const [collapsibleChecked, setCollapsibleChecked] = useState(false);

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
    const fetchTranslations = async () => {
      const trans = await useTranslation();
      if (trans) {
        setTranslations(trans);
      }
    };
    fetchTranslations();
  }, []);

  const [selectedLanguage, setSelectedLanguage] = useState(
    localStorage.getItem("selectedLanguage") || "en"
  );

  const languages = [
    { code: "en", name: "English", translations: enTranslations },
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

  useEffect(() => {
    const storedValue = localStorage.getItem("collapsibleHeading") === "true";
    setCollapsibleChecked(storedValue);
  }, []);

  const toggleCollapsible = () => {
    const newValue = !collapsibleChecked;
    setCollapsibleChecked(newValue);
    localStorage.setItem("collapsibleHeading", newValue.toString());
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

  const colors = [
    { name: "red", bg: "bg-red-500" },
    { name: "light", bg: "bg-amber-400" }, // Amber (yellow/orange)
    { name: "green", bg: "bg-emerald-500" },
    { name: "blue", bg: "bg-blue-400" },
    { name: "purple", bg: "bg-purple-400" },
    { name: "pink", bg: "bg-pink-400" },
    { name: "neutral", bg: "bg-neutral-400" }, // Neutral at the end
  ];

  document.addEventListener("DOMContentLoaded", () => {
    const savedColor = localStorage.getItem("color-scheme") || "light"; // Default to 'light' if not found
    setColor(savedColor);
  });

  const setColor = (color: any) => {
    const root = document.documentElement;
    root.classList.forEach((cls) => {
      if (cls !== "light" && cls !== "dark") {
        root.classList.remove(cls);
      }
    });
    root.classList.add(color);
    localStorage.setItem("color-scheme", color);
  };

  return (
    <div>
      <div className="grid sm:grid-cols-[auto]">
        <div className="overflow-y-hidden mb-12">
          <div className="py-2 w-full flex flex-col border-neutral-300 overflow-auto">
            <div className="mx-6 md:px-24 pb-8 overflow-y-auto flex-grow">
              <section aria-labelledby="settings-title">
                <p
                  id="settings-title"
                  className="text-4xl font-bold text-neutral-800 dark:text-[color:var(--selected-dark-text)]"
                >
                  {translations.settings.title || "-"}
                </p>
              </section>

              {/* App Theme */}
              <section aria-labelledby="app-theme-label">
                <p
                  id="app-theme-label"
                  className="text-xl py-2 text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
                >
                  {translations.settings.apptheme || "-"}
                </p>
                <div className="relative">
                  <select
                    aria-labelledby="app-theme-label"
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
                  <Icon
                    name="ArrowDownSLine"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none"
                  />
                </div>
              </section>

              <section aria-labelledby="app-theme-label">
                <p
                  id="app-theme-label"
                  className="text-xl py-2 text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
                >
                  {translations.settings.colorScheme || "-"}
                </p>
                <div className="w-full flex items-center justify-center gap-2">
                  {colors.map((color) => (
                    <button
                      key={color.name}
                      className={`${color.bg} p-2 w-10 h-10 rounded-full focus:ring-primary transition cursor-pointer `}
                      onClick={() => setColor(color.name)}
                    ></button>
                  ))}
                </div>
              </section>

              {/* Select Font */}
              <section aria-labelledby="select-font-label">
                <p
                  id="select-font-label"
                  className="text-xl py-2 text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
                >
                  {translations.settings.selectfont || "-"}
                </p>
                <div className="relative">
                  <select
                    aria-labelledby="select-font-label"
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
                  <Icon
                    name="ArrowDownSLine"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none"
                  />
                </div>
              </section>

              {/* Code Font */}
              <section aria-labelledby="code-font-label">
                <p
                  id="code-font-label"
                  className="text-xl py-2 text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
                >
                  {translations.settings.codeFont || "-"}
                </p>
                <div className="relative">
                  <select
                    aria-labelledby="code-font-label"
                    value={selectedCodeFont}
                    onChange={updatCodeFont}
                    className="rounded-full w-full p-3 text-neutral-800 bg-[#F8F8F7] dark:bg-[#2D2C2C] dark:text-[color:var(--selected-dark-text)] outline-none appearance-none"
                  >
                    {Codefonts.map((Codefont) => (
                      <option key={Codefont} value={Codefont}>
                        {Codefont}
                      </option>
                    ))}
                  </select>
                  <Icon
                    name="ArrowDownSLine"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none"
                  />{" "}
                </div>
              </section>

              {/* Select Language */}
              <section aria-labelledby="select-language-label">
                <p
                  id="select-language-label"
                  className="text-xl py-2 text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
                >
                  {translations.settings.selectlanguage || "-"}
                </p>
                <div className="relative">
                  <select
                    aria-labelledby="select-language-label"
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
                  <Icon
                    name="ArrowDownSLine"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none"
                  />
                </div>
              </section>

              {/* Interface Options */}
              <section aria-labelledby="interface-options-label">
                <p
                  id="interface-options-label"
                  className="text-xl py-4 text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
                >
                  {translations.settings.interfaceOptions || "-"}
                </p>

                {/* Toggle Expand Page */}
                <div className="hidden sm:block flex items-center py-2 dark:border-neutral-600 justify-between">
                  <p
                    id="expand-page-label"
                    className="block text-lg align-left"
                  >
                    {translations.settings.expandPage || "-"}
                  </p>
                  <label
                    className="relative inline-flex cursor-pointer items-center"
                    aria-labelledby="expand-page-label"
                  >
                    <input
                      type="checkbox"
                      checked={wd}
                      onChange={toggleBackground}
                      className="peer sr-only"
                      aria-checked={wd}
                    />
                    <div className="peer h-8 w-[3.75rem] rounded-full border dark:border-[#353333] dark:bg-[#353333] after:absolute after:left-[2px] rtl:after:right-[22px] after:top-0.5 after:h-7 after:w-7 after:rounded-full after:border after:border-neutral-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full rtl:peer-checked:after:border-white peer-focus:ring-green-300"></div>
                  </label>
                </div>

                {/* Toggle Clear Font */}
                <div className="flex items-center py-2 dark:border-neutral-600 justify-between">
                  <p id="clear-font-label" className="block text-lg align-left">
                    {translations.settings.clearFont || "-"}
                  </p>
                  <label
                    className="relative inline-flex cursor-pointer items-center"
                    aria-labelledby="clear-font-label"
                  >
                    <input
                      type="checkbox"
                      checked={ClearFontChecked}
                      onChange={toggleClearFont}
                      className="peer sr-only"
                      aria-checked={ClearFontChecked}
                    />
                    <div className="peer h-8 w-[3.75rem] rounded-full border dark:border-[#353333] dark:bg-[#353333] after:absolute after:left-[2px] rtl:after:right-[22px] after:top-0.5 after:h-7 after:w-7 after:rounded-full after:border after:border-neutral-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full rtl:peer-checked:after:border-white peer-focus:ring-green-300"></div>
                  </label>
                </div>

                <div className="flex items-center py-2 dark:border-neutral-600 justify-between">
                  <p id="clear-font-label" className="block text-lg align-left">
                    Collapsible Headings
                  </p>
                  <label
                    className="relative inline-flex cursor-pointer items-center"
                    aria-labelledby="clear-font-label"
                  >
                    <input
                      type="checkbox"
                      checked={collapsibleChecked}
                      onChange={toggleCollapsible}
                      className="peer sr-only"
                      aria-checked={collapsibleChecked}
                    />
                    <div className="peer h-8 w-[3.75rem] rounded-full border dark:border-[#353333] dark:bg-[#353333] after:absolute after:left-[2px] rtl:after:right-[22px] after:top-0.5 after:h-7 after:w-7 after:rounded-full after:border after:border-neutral-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full rtl:peer-checked:after:border-white peer-focus:ring-green-300"></div>
                  </label>
                </div>

                {/* Links */}
                <div className="pb-4">
                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      onClick={() => navigate("/Sync")}
                      aria-label={translations.settings.Sync || "-"}
                      className="w-full p-4 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl inline-flex items-center"
                    >
                      <Icon name="SyncLine" className="w-6 h-6 mr-2" />
                      {translations.settings.Sync || "-"}
                    </button>

                    <button
                      onClick={() => navigate("/icons")}
                      aria-label={translations.settings.Shortcuts || "-"}
                      className={`hidden sm:block w-full p-4 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl inline-flex items-center`}
                    >
                      <Icon name="Brush2Fill" className="w-6 h-6 mr-2" />
                      {translations.settings.appIcon || "-"}
                    </button>

                    <button
                      onClick={() => navigate("/shortcuts")}
                      aria-label={translations.settings.Shortcuts || "-"}
                      className="w-full p-4 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl inline-flex items-center"
                    >
                      <Icon name="KeyboardLine" className="w-6 h-6 mr-2" />
                      {translations.settings.Shortcuts || "-"}
                    </button>

                    <button
                      onClick={() => navigate("/about")}
                      aria-label={translations.settings.About || "-"}
                      className="w-full p-4 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl inline-flex items-center"
                    >
                      <Icon name="InformationLine" className="w-6 h-6 mr-2" />
                      {translations.settings.About || "-"}
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
