import React, { useState, useEffect } from "react";
import enTranslations from "./assets/locales/en.json";
import deTranslations from "./assets/locales/de.json";
import { useTheme } from "@/composable/theme";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "./utils/translations";
import Icon from "./components/ui/Icon";
import { Preferences } from "@capacitor/preferences";
import { clearIndex, indexData } from "./utils/spotsearch";
import UiSelect from "./components/ui/Select";
import { useAppStore } from "./store/app";

const Settings: React.FC = () => {
  const appStore = useAppStore();
  const theme = useTheme();
  const [selectedOption, setSelectedOption] = useState<
    "light" | "dark" | "system"
  >("system");

  useEffect(() => {
    setSelectedOption(theme.currentTheme);
  }, [theme.currentTheme]);

  const handleChangeMode = async (value: "light" | "dark" | "system") => {
    setSelectedOption(value);
    await theme.setTheme(value, value === "system");
  };

  const modes: Array<"light" | "dark" | "system"> = ["light", "dark", "system"];

  const navigate = useNavigate();
  const [translations, setTranslations] = useState<Record<string, any>>({
    settings: {},
  });
  const [activeColor, setActiveColor] = useState<string>("light");
  const [collapsibleHeading, setCollapsibleHeading] = useCollapsibleHeading();
  const [selectedFont, setSelectedFont] = useState<string>("Arimo");
  const [selectedCodeFont, setSelectedCodeFont] =
    useState<string>("JetBrains Mono");
  const [indexingChecked, setIndexingChecked] = useState(false);
  const [wd, setwd] = useState<boolean>(false);
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [ClearFontChecked, setClearFontChecked] = useState(false);

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
    (async () => {
      const font = await Preferences.get({ key: "selected-font" });
      if (font.value) setSelectedFont(font.value);

      const codeFont = await Preferences.get({ key: "selected-font-code" });
      if (codeFont.value) setSelectedCodeFont(codeFont.value);

      const expandEditor = await Preferences.get({ key: "expand-editor" });
      setwd(expandEditor.value === "true");

      const lang = await Preferences.get({ key: "selectedLanguage" });
      if (lang.value) setSelectedLanguage(lang.value);

      const darkText = await Preferences.get({ key: "selected-dark-text" });
      setClearFontChecked(darkText.value === "#CCCCCC");

      const indexing = await Preferences.get({ key: "indexing" });
      setIndexingChecked(indexing.value === "true");
    })();
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty("--selected-font", selectedFont);
    Preferences.set({ key: "selected-font", value: selectedFont });
  }, [selectedFont]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--selected-font-code",
      selectedCodeFont
    );
    Preferences.set({ key: "selected-font-code", value: selectedCodeFont });
  }, [selectedCodeFont]);

  const toggleBackground = async () => {
    const newValue = !wd;
    setwd(newValue);
    await Preferences.set({ key: "expand-editor", value: newValue.toString() });
  };

  const languages = [
    { code: "en", name: "English", translations: enTranslations },
    { code: "de", name: "Deutsch", translations: deTranslations },
  ];

  useEffect(() => {
    const fetchTranslations = async () => {
      const trans = await useTranslation();
      if (trans) setTranslations(trans);
    };
    fetchTranslations();
  }, []);

  const toggleClearFont = async () => {
    const newValue = !ClearFontChecked;
    setClearFontChecked(newValue);
    await Preferences.set({
      key: "selected-dark-text",
      value: newValue ? "#CCCCCC" : "white",
    });
    document.documentElement.style.setProperty(
      "selected-dark-text",
      newValue ? "#CCCCCC" : "white"
    );
    window.location.reload();
  };

  function useCollapsibleHeading() {
    const get = () => appStore.setting.collapsibleHeading;
    const set = (v: boolean) =>
      appStore.setSettingStorage("collapsibleHeading", v);
    return [get(), set];
  }

  const toggleCollapsible = () => {
    setCollapsibleHeading(!collapsibleHeading);
  };

  const toggleIndexing = async () => {
    const newValue = !indexingChecked;
    setIndexingChecked(newValue);
    await Preferences.set({ key: "indexing", value: newValue.toString() });

    try {
      if (newValue) {
        await indexData();
      } else {
        await clearIndex();
      }
    } catch (e) {
      console.error("Indexing toggle error:", e);
    }
  };

  const colors = [
    { name: "red", bg: "bg-red-500" },
    { name: "light", bg: "bg-amber-400" },
    { name: "green", bg: "bg-emerald-500" },
    { name: "blue", bg: "bg-blue-400" },
    { name: "purple", bg: "bg-purple-400" },
    { name: "pink", bg: "bg-pink-400" },
    { name: "neutral", bg: "bg-neutral-400" },
  ];

  const setColor = async (color: string) => {
    const root = document.documentElement;
    root.classList.forEach((cls) => {
      if (cls !== "light" && cls !== "dark") root.classList.remove(cls);
    });
    root.classList.add(color);
    setActiveColor(color);
    await Preferences.set({ key: "color-scheme", value: color });
  };

  useEffect(() => {
    (async () => {
      const savedColor = await Preferences.get({ key: "color-scheme" });
      const color = savedColor.value || "light";
      setActiveColor(color); // <-- add this
      setColor(color);
    })();
  }, []);

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
                  <UiSelect
                    modelValue={selectedOption}
                    onChange={(val) =>
                      handleChangeMode(val as "light" | "dark" | "system")
                    }
                    options={modes} // if modes = ["light", "dark", "system"]
                    block
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
                      aria-label={color.name}
                      aria-pressed={activeColor === color.name}
                      onClick={() => setColor(color.name)}
                      className={`${
                        color.bg
                      } p-2 w-10 h-10 rounded-full transition cursor-pointer focus:outline-none
        ${
          activeColor === color.name
            ? "ring-2 ring-primary"
            : "hover:ring-2 hover:ring-neutral-300 focus:ring-2 focus:ring-primary"
        }`}
                    />
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
                <UiSelect
                  modelValue={selectedFont}
                  onChange={(val) => setSelectedFont(val as string)}
                  options={fonts}
                  search={true}
                  block
                />
              </section>

              {/* Code Font */}
              <section aria-labelledby="code-font-label">
                <p
                  id="code-font-label"
                  className="text-xl py-2 text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
                >
                  {translations.settings.codeFont || "-"}
                </p>
                <UiSelect
                  modelValue={selectedCodeFont}
                  onChange={(val) => setSelectedCodeFont(val as string)}
                  options={Codefonts}
                  block
                />
              </section>

              {/* Select Language */}
              <section aria-labelledby="select-language-label">
                <p
                  id="select-language-label"
                  className="text-xl py-2 text-neutral-700 dark:text-[color:var(--selected-dark-text)]"
                >
                  {translations.settings.selectlanguage || "-"}
                </p>
                <UiSelect
                  modelValue={selectedLanguage}
                  onChange={async (val) => {
                    setSelectedLanguage(val as string);
                    await Preferences.set({
                      key: "selectedLanguage",
                      value: val as string,
                    });
                    window.location.reload();
                  }}
                  options={languages.map((l) => ({
                    value: l.code,
                    text: l.name,
                  }))}
                  block
                />
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
                <div className="hidden sm:flex items-center py-2 dark:border-neutral-600 justify-between">
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
                      checked={collapsibleHeading}
                      onChange={toggleCollapsible}
                      className="peer sr-only"
                      aria-checked={collapsibleHeading}
                    />
                    <div className="peer h-8 w-[3.75rem] rounded-full border dark:border-[#353333] dark:bg-[#353333] after:absolute after:left-[2px] rtl:after:right-[22px] after:top-0.5 after:h-7 after:w-7 after:rounded-full after:border after:border-neutral-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full rtl:peer-checked:after:border-white peer-focus:ring-green-300"></div>
                  </label>
                </div>

                <div className="flex items-center py-2 dark:border-neutral-600 justify-between">
                  <p id="clear-font-label" className="block text-lg align-left">
                    Allow Indexing
                  </p>
                  <label
                    className="relative inline-flex cursor-pointer items-center"
                    aria-labelledby="clear-font-label"
                  >
                    <input
                      type="checkbox"
                      checked={indexingChecked}
                      onChange={toggleIndexing}
                      className="peer sr-only"
                      aria-checked={indexingChecked}
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
                      className={`w-full p-4 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl inline-flex items-center`}
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
