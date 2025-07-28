import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import enTranslations from "./assets/locales/en.json";
import deTranslations from "./assets/locales/de.json";
import Icon from "./components/ui/Icon";
import Dropbox from "./pages/settings/sync/dropbox";
import Icloud from "./pages/settings/sync/icloud";
import Onedrive from "./pages/settings/sync/onedrive";
import Drive from "./pages/settings/sync/drive";
import Dav from "./pages/settings/sync/dav";
import { useTranslation } from "./utils/translations";
import { IconName } from "./lib/remixicon-react";

const Welcome: React.FC = () => {
  const [selectedCloud, setSelectedCloud] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<
    "view1" | "view2" | "view3" | "view4"
  >("view1");
  const history = useNavigate();

  const handleViewChange = (view: "view1" | "view2" | "view3" | "view4") => {
    setCurrentView(view);
  };

  const [selectedFont, setSelectedFont] = useState<string>(
    localStorage.getItem("selected-font") || "Arimo"
  );

  const [selectedCodeFont, setSelectedCodeFont] = useState<string>(
    localStorage.getItem("selected-font-code") || "JetBrains Mono"
  );

  const Codefonts = [
    "JetBrains Mono",
    "Anonymous Pro",
    "Source Code Pro",
    "Hack",
  ];

  const fonts = [
    "Arimo",
    "Avenir",
    "Helvetica",
    "EB Garamond",
    "OpenDyslexic",
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
  const [selectedLanguage, setSelectedLanguage] = useState(
    localStorage.getItem("selectedLanguage") || "en"
  );

  const [translations, setTranslations] = useState<Record<string, any>>({
    welcome: {},
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

  const languages = [
    { code: "en", name: "English", translations: enTranslations },
    { code: "de", name: "Deutsch", translations: deTranslations },
  ];

  const updateLanguage = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const languageCode = event.target.value;
    setSelectedLanguage(languageCode);
    localStorage.setItem("selectedLanguage", languageCode);
    location.reload();
  };

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

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("themeMode", themeMode);
  }, [darkMode, themeMode]);

  const toggleTheme = (
    newMode: boolean | ((prevState: boolean) => boolean)
  ) => {
    setDarkMode(newMode);
    setThemeMode(newMode ? "dark" : "light");
  };

  const setAutoMode = () => {
    const prefersDarkMode = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    setDarkMode(prefersDarkMode);
    setThemeMode("auto");
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

  useEffect(() => {
    if (currentView === "view4") {
      const timer = setTimeout(() => {
        history("/");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [currentView, history]);

  const colors = [
    { name: "red", bg: "bg-red-500" },
    { name: "light", bg: "bg-amber-400" },
    { name: "green", bg: "bg-emerald-500" },
    { name: "blue", bg: "bg-blue-400" },
    { name: "purple", bg: "bg-purple-400" },
    { name: "pink", bg: "bg-pink-400" },
    { name: "neutral", bg: "bg-neutral-400" },
  ];

  document.addEventListener("DOMContentLoaded", () => {
    const savedColor = localStorage.getItem("color-scheme") || "light";
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
    <div className={`view ${currentView} overflow-y-hide`}>
      {currentView === "view1" && (
        <div className="view flex items-center justify-center">
          <div className="w-full sm:w-[32em] mx-10 rounded-3xl flex flex-col justify-between h-full">
            <div className="mt-5 flex justify-center">
              <img
                src="./imgs/icon.png"
                alt="Beaver Notes Icon"
                className="w-12 h-12 mx-auto rounded-xl"
              />
            </div>
            <div className="flex flex-col items-center justify-center flex-grow">
              <h3
                className="text-center"
                aria-label={translations.welcome.welcomeTitle || "-"}
              >
                {translations.welcome.welcomeTitle || "-"}
              </h3>
              <p
                className="text-center sm:mx-10"
                aria-label={translations.welcome.welcomeMessage || "-"}
              >
                {translations.welcome.welcomeMessage || "-"}
              </p>
            </div>
            <div className="flex flex-col w-full items-center mb-5 gap-2">
              <div className="relative w-full">
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
                <Icon
                  name="ArrowDownSLine"
                  className="dark:text-[color:var(--selected-dark-text)] ri-arrow-down-s-line absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-600 pointer-events-none"
                  aria-hidden="true"
                />
              </div>
              <button
                className="w-full p-3 rounded-full bg-neutral-800 hover:bg-neutral-800/90 dark:bg-neutral-700/50 hover:bg-neutral-700/60 text-white"
                onClick={() => handleViewChange("view2")}
                aria-label={translations.welcome.getStarted || "-"}
              >
                {translations.welcome.getStarted || "-"}
              </button>
            </div>
          </div>
        </div>
      )}

      {currentView === "view2" && (
        <div className="flex view items-center justify-center">
          <div className="w-full sm:w-[32em] mx-10 rounded-3xl flex flex-col justify-between h-full">
            <div className="mt-5 flex flex-col justify-center">
              <Icon
                name="FontSize"
                className="w-12 h-12 mx-auto rounded-xl"
                aria-hidden="true"
              />
              <h3
                className="text-center"
                aria-label={translations.welcome.themeTitle || "-"}
              >
                {translations.welcome.themeTitle || "-"}
              </h3>
            </div>
            <div className="flex flex-col w-full items-center justify-center flex-grow">
              <section
                className="w-full relative"
                aria-label={translations.settings.apptheme || "-"}
              >
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
                  <Icon
                    name="ArrowDownSLine"
                    className="dark:text-[color:var(--selected-dark-text)] ri-arrow-down-s-line absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-600 pointer-events-none"
                    aria-hidden="true"
                  />
                </div>
              </section>
              <section
                className="w-full relative"
                aria-labelledby="app-theme-label"
              >
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
              <section
                className="w-full relative"
                aria-label={translations.settings.selectfont || "-"}
              >
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
                  <Icon
                    name="ArrowDownSLine"
                    className="dark:text-[color:var(--selected-dark-text)] ri-arrow-down-s-line absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-600 pointer-events-none"
                    aria-hidden="true"
                  />
                </div>
              </section>
              <section
                className=" w-full relative"
                aria-label={translations.settings.codeFont || "-"}
              >
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
                  <Icon
                    name="ArrowDownSLine"
                    className="dark:text-[color:var(--selected-dark-text)] ri-arrow-down-s-line absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-600 pointer-events-none"
                    aria-hidden="true"
                  />
                </div>
              </section>
            </div>
            <div className="flex flex-col w-full items-center mb-5 gap-2">
              <button
                className="w-full p-3 rounded-full bg-neutral-800 hover:bg-neutral-800/90 dark:bg-neutral-700/50 hover:bg-neutral-700/60 text-white"
                onClick={() => handleViewChange("view1")}
                aria-label={translations.welcome.back || "-"}
              >
                {translations.welcome.back || "-"}
              </button>
              <button
                className="w-full p-3 rounded-full bg-neutral-800 hover:bg-neutral-800/90 dark:bg-neutral-700/50 hover:bg-neutral-700/60 text-white"
                onClick={() => handleViewChange("view3")}
                aria-label={translations.welcome.next || "-"}
              >
                {translations.welcome.next || "-"}
              </button>
            </div>
          </div>
        </div>
      )}

      {currentView === "view3" && (
        <div className="min-h-screen flex flex-col justify-start items-center py-10">
          <div className="flex justify-center">
            <Icon
              name="CloudLine"
              className="w-12 h-12 mx-auto rounded-xl"
              aria-hidden="true"
            />
          </div>

          <div className="flex view items-center justify-center w-full">
            <div className="w-full sm:w-[32em] mx-10 rounded-3xl flex flex-col justify-between min-h-[80vh]">
              <div className="flex flex-col w-full items-center justify-center flex-grow">
                {/* Cloud selection buttons */}
                {selectedCloud === null ? (
                  <div className="flex flex-col gap-2 pt-2 w-full">
                    {[
                      { name: "iCloud", icon: "iCloud", component: Icloud },
                      {
                        name: "Dropbox",
                        icon: "DropboxFill",
                        component: Dropbox,
                      },
                      {
                        name: "OneDrive",
                        icon: "OneDrive",
                        component: Onedrive,
                      },
                      {
                        name: "Google Drive",
                        icon: "GDrive",
                        component: Drive,
                      },
                      { name: "WebDAV", icon: "CloudLine", component: Dav },
                    ].map((cloud) => (
                      <button
                        key={cloud.name}
                        onClick={() => setSelectedCloud(cloud.name)}
                        className="w-full p-4 text-xl bg-neutral-100 dark:bg-neutral-700/50 rounded-xl inline-flex items-center"
                      >
                        <Icon
                          name={cloud.icon as IconName}
                          className="w-10 h-10"
                        />
                        <p className="text-xl pl-2 py-1 font-bold">
                          {cloud.name}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 w-full">
                    {selectedCloud === "iCloud" && (
                      <Icloud syncStatus="idle" disableClass={true} />
                    )}
                    {selectedCloud === "Dropbox" && (
                      <Dropbox syncStatus="idle" disableClass={true} />
                    )}
                    {selectedCloud === "OneDrive" && (
                      <Onedrive syncStatus="idle" disableClass={true} />
                    )}
                    {selectedCloud === "Google Drive" && (
                      <Drive syncStatus="idle" disableClass={true} />
                    )}
                    {selectedCloud === "WebDAV" && (
                      <Dav syncStatus="idle" disableClass={true} />
                    )}
                  </div>
                )}
              </div>

              {/* Footer buttons */}
              <div className="flex flex-col w-full items-center mb-5 gap-2">
                {selectedCloud !== null ? (
                  <>
                    <button
                      className="w-full p-3 rounded-full bg-neutral-800 hover:bg-neutral-800/90 dark:bg-neutral-700/50 hover:bg-neutral-700/60 text-white"
                      onClick={() => setSelectedCloud(null)}
                    >
                      {translations.welcome.back || "Back"}
                    </button>
                    <button
                      className="w-full p-3 rounded-full bg-neutral-800 hover:bg-neutral-800/90 dark:bg-neutral-700/50 hover:bg-neutral-700/60 text-white"
                      onClick={() => handleViewChange("view4")}
                    >
                      {translations.welcome.next || "Done"}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="w-full p-3 rounded-full bg-neutral-800 hover:bg-neutral-800/90 dark:bg-neutral-700/50 hover:bg-neutral-700/60 text-white"
                      onClick={() => handleViewChange("view2")}
                    >
                      {translations.welcome.back || "Back"}
                    </button>
                    <button
                      className="w-full p-3 rounded-full bg-neutral-800 hover:bg-neutral-800/90 dark:bg-neutral-700/50 hover:bg-neutral-700/60 text-white"
                      onClick={() => handleViewChange("view4")}
                    >
                      {translations.welcome.skip || "Skip"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {currentView === "view4" && (
        <div className="flex view items-center justify-center">
          <div className="w-full sm:w-[32em] mx-10 rounded-3xl flex flex-col justify-between h-full">
            <div className="flex flex-col w-full items-center justify-center flex-grow">
              <h3
                className="text-center"
                aria-label={translations.welcome.startTitle || "-"}
              >
                {translations.welcome.startTitle || "-"}
              </h3>
            </div>
            <div className="flex flex-col w-full items-center mb-5 gap-2">
              <button
                className="w-full p-3 rounded-full bg-neutral-800 hover:bg-neutral-800/90 dark:bg-neutral-700/50 hover:bg-neutral-700/60 text-white"
                onClick={() => handleViewChange("view3")}
                aria-label={translations.welcome.back || "-"}
              >
                {translations.welcome.back || "-"}
              </button>
              <Link
                to="/"
                className="w-full text-center p-3 rounded-full bg-[#2D2C2C] hover:bg-[#3a3939] text-white"
                onClick={() => handleViewChange("view4")}
                aria-label={translations.welcome.next || "-"}
              >
                {translations.welcome.next || "-"}
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-2">
        <span
          className={`transition-all w-3 h-3 rounded-full ${
            currentView === "view1"
              ? "w-6 bg-primary"
              : "bg-neutral-100 dark:bg-neutral-500"
          }`}
        ></span>
        <span
          className={`transition-all w-3 h-3 rounded-full ${
            currentView === "view2"
              ? "w-6 bg-primary"
              : "bg-neutral-100 dark:bg-neutral-500"
          }`}
        ></span>
        <span
          className={`transition-all w-3 h-3 rounded-full ${
            currentView === "view3"
              ? "w-6 bg-primary"
              : "bg-neutral-100 dark:bg-neutral-500"
          }`}
        ></span>
        <span
          className={`transition-all w-3 h-3 rounded-full ${
            currentView === "view4"
              ? "w-6 bg-primary"
              : "bg-neutral-100 dark:bg-neutral-500"
          }`}
        ></span>
      </div>
    </div>
  );
};
export default Welcome;
