import React, { useState, useEffect } from "react";
import { version } from "../../package.json";
import icons from "../lib/remixicon-react";
import dayjs from "dayjs";

const Shortcuts: React.FC = () => {

  // @ts-ignore
  const [sortingOption, setSortingOption] = useState("updatedAt");

  // Translations
  const [translations, setTranslations] = useState({
    about: {
      title: "about.title",
      app: "about.app",
      description: "about.description",
      version: "about.version",
      website: "about.website",
      github: "about.github",
      donate: "about.donate",
      copyright: "about.Copyright",
    },
    home: {
      exportSuccess: "home.exportSuccess",
      exportError: "home.exportError",
      shareTitle: "home.shareTitle",
      shareError: "home.shareError",
      importSuccess: "home.importSuccess",
      importError: "home.importError",
      importInvalid: "home.importInvalid",
      title: "home.title",
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
        dayjs.locale(selectedLanguage);
      } catch (error) {
        console.error("Error loading translations:", error);
      }
    };

    loadTranslations();
  }, []);

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
      <div className="safe-area"></div>

        <div className="overflow-y-hidden mb-12">
            <div className="mx-2 sm:px-20 mb-2">
              <div className="general py-2 space-y-8 w-full">
                <div className="py-2 mx-2 sm:px-20 mb-2">
                  <div className="general space-y-3 w-full">
                    <img
                      src="./imgs/icon.png"
                      alt="Beaver Notes Icon"
                      className="w-32 h-32 rounded-full"
                    />
                    <h4 className="mt-4 font-bold">
                      {" "}
                      {translations.about.app}
                    </h4>
                    <p>{translations.about.description}</p>
                    <p className="mt-2">
                      {translations.about.version}{" "}
                      <span className="ml-8">{version}</span>
                    </p>

                    <p>{translations.about.copyright}</p>

                    <div className="mt-4 flex gap-4">
                      <a
                        href="https://beavernotes.com"
                        className="flex items-center"
                      >
                        <icons.GlobalLineIcon className="w-6 h-6 mr-2" />
                        {translations.about.website}
                      </a>

                      <a
                        href="https://github.com/Daniele-rolli/Beaver-notes-pocket"
                        className="flex items-center"
                      >
                        <icons.GithubFillIcon className="w-6 h-6 mr-2" />
                        {translations.about.github}
                      </a>

                      <a
                        href="https://www.buymeacoffee.com/beavernotes"
                        className="flex items-center"
                      >
                        <icons.CupLineIcon className="w-6 h-6 mr-2" />
                        {translations.about.donate}
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
      </div>
    </div>
  );
};

export default Shortcuts;
