import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Icons from "./lib/remixicon-react";
import enTranslations from "./assets/locales/en.json";
import itTranslations from "./assets/locales/it.json";
import deTranslations from "./assets/locales/de.json";

const Welcome: React.FC = () => {
  const [currentView, setCurrentView] = useState<"view1" | "view2" | "view3">(
    "view1"
  );
  const history = useNavigate(); // Initialize useHistory

  const handleViewChange = (view: "view1" | "view2" | "view3") => {
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

  // Translations
  const [translations, setTranslations] = useState({
    welcome: {
      next: "welcome.next",
      back: "welcome.back",
      welcomeTitle: "welcome.welcomeTitle",
      welcomeParagraph: "welcome.welcomeParagraph",
      welcomeWarning: "welcome.welcomeWarning",
      languageText: "welcome.languageText",
      getStarted: "welcome.getStarted",
      themeTitle: "welcome.themeTitle",
      themeText: "welcome.themeText",
      typographyTitle: "welcome.typographyTitle",
      typographyText: "welcome.typographyText",
      importTitle: "welcome.importTitle",
      importText: "welcome.importText",
      start: "welcome.start",
      startTitle: "welcome.startTitle",
      skip: "welcome.skip",
      dark: "welcome.dark",
      light: "welcome.light",
      system: "welcome.system",
      import: "welcome.import",
    },
    settings: {
      apptheme: "settings.appTheme",
      selectfont: "settings.selectfont",
    },
  });

  const languages = [
    { code: "en", name: "English", translations: enTranslations },
    { code: "it", name: "Italiano", translations: itTranslations },
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
  };

  // Function to set theme mode to auto based on device preference
  const setAutoMode = () => {
    const prefersDarkMode = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    setDarkMode(prefersDarkMode);
    setThemeMode("auto");
  };

  const modes = ["Light", "Dark", "System"];

  const [selectedOption, setSelectedOption] = useState(
    themeMode === "auto" ? "System" : darkMode ? "Dark" : "Light"
  );

  const handleChangeMode = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedOption(event.target.value);
    switch (event.target.value) {
      case "Light":
        toggleTheme(false);
        break;
      case "Dark":
        toggleTheme(true);
        break;
      case "System":
        setAutoMode();
        break;
      default:
        break;
    }
  };

  // Redirect to home page if currentView is "view3" after 3 seconds
  useEffect(() => {
    if (currentView === "view3") {
      const timer = setTimeout(() => {
        history("/");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [currentView, history]);

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
              <h3 className="text-center">
                {translations.welcome.welcomeTitle || "-"}
              </h3>
              <p className="text-center sm:mx-10">
                Build your knowledge one log at the time
              </p>
            </div>
            <div className="flex flex-col w-full items-center mb-5 gap-2">
              <div className="relative w-full">
                <select
                  value={selectedLanguage}
                  onChange={updateLanguage}
                  className="rounded-full w-full p-3 text-gray-800 bg-[#F8F8F7] dark:bg-[#2D2C2C] dark:text-[color:var(--selected-dark-text)] outline-none appearance-none"
                >
                  {languages.map((language) => (
                    <option key={language.code} value={language.code}>
                      {language.name}
                    </option>
                  ))}
                </select>
                <Icons.ArrowDownSLineIcon className="dark:text-[color:var(--selected-dark-text)] ri-arrow-down-s-line absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 pointer-events-none" />
              </div>
              <button
                className="w-full p-3 rounded-full bg-[#2D2C2C] hover:bg-[#3a3939] text-white"
                onClick={() => handleViewChange("view2")}
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
            <div className="mt-5 flex justify-center">
              <Icons.FontSizeIcon className="w-12 h-12 mx-auto rounded-xl" />
            </div>
            <div className="flex flex-col w-full items-center justify-center flex-grow">
              <h3 className="text-center">Make it Yours</h3>
              <section className="w-full relative">
                <p className="text-xl py-2 text-neutral-700 dark:text-[color:var(--selected-dark-text)]">
                  {translations.settings.apptheme || "-"}
                </p>
                <div className="relative">
                  <select
                    value={selectedOption}
                    onChange={handleChangeMode}
                    className="rounded-full w-full p-3 text-gray-800 bg-[#F8F8F7] dark:bg-[#2D2C2C] dark:text-[color:var(--selected-dark-text)] outline-none appearance-none"
                  >
                    {modes.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode}
                      </option>
                    ))}
                  </select>
                  <Icons.ArrowDownSLineIcon className="dark:text-[color:var(--selected-dark-text)] ri-arrow-down-s-line absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 pointer-events-none" />
                </div>
              </section>
              <section className="w-full relative">
                <p className="text-xl py-2 text-neutral-700 dark:text-[color:var(--selected-dark-text)]">
                  {translations.settings.selectfont || "-"}
                </p>
                <div className="relative">
                  <select
                    value={selectedFont}
                    onChange={updateFont}
                    className="rounded-full w-full p-3 text-gray-800 bg-[#F8F8F7] dark:bg-[#2D2C2C] dark:text-[color:var(--selected-dark-text)] outline-none appearance-none"
                  >
                    {fonts.map((font) => (
                      <option key={font} value={font}>
                        {font}
                      </option>
                    ))}
                  </select>
                  <Icons.ArrowDownSLineIcon className="dark:text-[color:var(--selected-dark-text)] ri-arrow-down-s-line absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 pointer-events-none" />
                </div>
              </section>
              <section className=" w-full relative">
                <p className="text-xl py-2 text-neutral-700 dark:text-[color:var(--selected-dark-text)]">
                  Select Font Code
                </p>
                <div className="relative">
                  <select
                    value={selectedCodeFont}
                    onChange={updatCodeFont}
                    className="rounded-full w-full p-3 text-gray-800 bg-[#F8F8F7] dark:bg-[#2D2C2C] dark:text-[color:var(--selected-dark-text)] outline-none appearance-none"
                  >
                    {Codefonts.map((Codefonts) => (
                      <option key={Codefonts} value={Codefonts}>
                        {Codefonts}
                      </option>
                    ))}
                  </select>
                  <Icons.ArrowDownSLineIcon className="dark:text-[color:var(--selected-dark-text)] ri-arrow-down-s-line absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 pointer-events-none" />
                </div>
              </section>
            </div>
            <div className="flex flex-col w-full items-center mb-5 gap-2">
              <button
                className="w-full p-3 rounded-full bg-[#2D2C2C] hover:bg-[#3a3939] text-white"
                onClick={() => handleViewChange("view1")}
              >
                {translations.welcome.back || "-"}
              </button>
              <button
                className="w-full p-3 rounded-full bg-[#2D2C2C] hover:bg-[#3a3939] text-white"
                onClick={() => handleViewChange("view3")}
              >
                {translations.welcome.next || "-"}
              </button>
            </div>
          </div>
        </div>
      )}

      {currentView === "view3" && (
        <div className="flex view items-center justify-center">
          <div className="w-full sm:w-[32em] mx-10 rounded-3xl flex flex-col justify-between h-full">
            <div className="flex flex-col w-full items-center justify-center flex-grow">
              <h3 className="text-center">🎉 Ready, Set, Go!</h3>
            </div>
            <div className="flex flex-col w-full items-center mb-5 gap-2">
              <button
                className="w-full p-3 rounded-full bg-[#2D2C2C] hover:bg-[#3a3939] text-white"
                onClick={() => handleViewChange("view2")}
              >
                {translations.welcome.back || "-"}
              </button>
              <Link
                to="/"
                className="w-full text-center p-3 rounded-full bg-[#2D2C2C] hover:bg-[#3a3939] text-white"
                onClick={() => handleViewChange("view3")}
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
            currentView === "view1" ? "w-6 bg-amber-400" : "bg-neutral-100 dark:bg-neutral-500"
          }`}
        ></span>
        <span
          className={`transition-all w-3 h-3 rounded-full ${
            currentView === "view2" ? "w-6 bg-amber-400" : "bg-neutral-100 dark:bg-neutral-500"
          }`}
        ></span>
        <span
          className={`transition-all w-3 h-3 rounded-full ${
            currentView === "view3" ? "w-6 bg-amber-400" : "bg-neutral-100 dark:bg-neutral-500"
          }`}
        ></span>
      </div>
    </div>
  );
};
export default Welcome;
