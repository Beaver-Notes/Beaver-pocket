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
      termsConditions: "about.termsConditions",
      privacyPolicy: "about.privacyPolicy",
      license: "about.license",
      legal: "about.legal",
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
      <div className="overflow-y-hidden mb-12">
        <div className="mx-6 md:px-24 pb-8 overflow-y-auto flex-grow">
          <div className="general py-2 space-y-8 w-full">
            <div className="flex items-center justify-center">
              <img
                src="./imgs/icon.png"
                alt="Beaver Notes Icon"
                className="w-36 h-36 rounded-full"
                role="img"
                aria-label={translations.about.app}
              />
            </div>
            <p
              className="text-xl mt-4 font-bold text-center"
              aria-label={translations.about.app}
            >
              {translations.about.app}
            </p>
            <p className="text-center" aria-label={`${version}`}>
              {version}
            </p>
            <p
              className="text-center"
              aria-label={translations.about.description}
            >
              {translations.about.description}
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => window.open("https://beavernotes.com", "_blank")}
                className="w-full p-3 text-lg bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl inline-flex items-center"
                aria-label={`${translations.about.website}`}
              >
                <icons.GlobalLineIcon className="w-8 h-8" aria-hidden="true" />
                <p className="text-lg pl-2 py-1 font-bold">
                  {translations.about.website}
                </p>
              </button>
              <button
                onClick={() =>
                  window.open(
                    "https://github.com/Daniele-rolli/Beaver-notes-pocket",
                    "_blank"
                  )
                }
                className="w-full p-3 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl inline-flex items-center"
                aria-label={`${translations.about.github}`}
              >
                <icons.GithubFillIcon className="w-8 h-8" aria-hidden="true" />
                <p className="text-lg pl-2 py-1 font-bold">
                  {translations.about.github}
                </p>
              </button>
              <button
                onClick={() =>
                  window.open(
                    "https://www.buymeacoffee.com/beavernotes",
                    "_blank"
                  )
                }
                className="w-full p-3 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl inline-flex items-center"
                aria-label={`${translations.about.donate}`}
              >
                <icons.CupLineIcon className="w-8 h-8" aria-hidden="true" />
                <p className="text-lg pl-2 py-1 font-bold">
                  {translations.about.donate}
                </p>
              </button>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <p className="text-2xl font-bold" aria-label={`${translations.about.legal}`}>
              {translations.about.legal}
              </p>
              <button
                onClick={() =>
                  window.open("https://beavernotes.com/#/Terms", "_blank")
                }
                className="w-full p-3 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl inline-flex items-center"
                aria-label={`${translations.about.termsConditions}`}
              >
                <p className="text-lg pl-2 py-1 font-bold">
                  {translations.about.termsConditions}
                </p>
              </button>
              <button
                onClick={() =>
                  window.open("https://beavernotes.com/#/Privacy", "_blank")
                }
                className="w-full p-3 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl inline-flex items-center"
                aria-label={`${translations.about.privacyPolicy}`}
              >
                <p className="text-lg pl-2 py-1 font-bold">
                  {translations.about.privacyPolicy}
                </p>
              </button>
              <button
                onClick={() =>
                  window.open(
                    "https://raw.githubusercontent.com/Beaver-Notes/Beaver-pocket/main/LICENSE.txt",
                    "_blank"
                  )
                }
                className="w-full p-3 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl inline-flex items-center"
                aria-label={`${translations.about.license}`}
              >
                <p className="text-lg pl-2 py-1 font-bold">
                  {translations.about.license}
                </p>
              </button>
            </div>
            <p
              className="pt-2 text-center"
              aria-label={translations.about.copyright}
            >
              {translations.about.copyright}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Shortcuts;
