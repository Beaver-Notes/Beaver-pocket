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
      license: "about.license"
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
        <div className="mx-2 sm:px-20 mb-2">
          <div className="general py-2 space-y-8 w-full">
            <div className="py-2 mx-2 sm:px-20 mb-2">
              <div className="flex items-center justify-center">
                <img
                  src="./imgs/icon.png"
                  alt="Beaver Notes Icon"
                  className="w-36 h-36 rounded-full"
                />
              </div>
              <p className="text-xl mt-4 font-bold text-center">
                {" "}
                {translations.about.app}
              </p>
              <p className="text-center">{version}</p>
              <p className="text-center">{translations.about.description}</p>
              <div className="flex flex-col gap-2 pt-2">
                <a
                  href="https://beavernotes.com"
                  className="w-full p-3 text-lg bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl inline-flex items-center"
                >
                  <icons.GlobalLineIcon className="w-8 h-8" />
                  <p className="text-lg pl-2 py-1 font-bold">
                    {" "}
                    {translations.about.website}
                  </p>
                </a>
                <a
                  href="https://github.com/Daniele-rolli/Beaver-notes-pocket"
                  className="w-full p-3 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl inline-flex items-center"
                >
                  <icons.GithubFillIcon className="w-8 h-8" />
                  <p className="text-lg pl-2 py-1 font-bold">
                    {" "}
                    {translations.about.github}
                  </p>
                </a>
                <a
                  href="https://www.buymeacoffee.com/beavernotes"
                  className="w-full p-3 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl inline-flex items-center"
                >
                  <icons.CupLineIcon className="w-8 h-8" />
                  <p className="text-lg pl-2 py-1 font-bold">
                    {" "}
                    {translations.about.donate}
                  </p>
                </a>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <p className="text-2xl font-bold">Legal</p>
                <a
                  href="https://beavernotes.com/#/Terms"
                  className="w-full p-3 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl inline-flex items-center"
                >
                  <p className="text-lg pl-2 py-1 font-bold">
                  {translations.about.termsConditions}
                  </p>
                </a>
                <a
                  href="https://beavernotes.com/#/Privacy"
                  className="w-full p-3 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl inline-flex items-center"
                >
                  <p className="text-lg pl-2 py-1 font-bold">{translations.about.privacyPolicy}</p>
                </a>
                <a
                  href="https://raw.githubusercontent.com/Beaver-Notes/Beaver-pocket/main/LICENSE.txt"
                  className="w-full p-3 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl inline-flex items-center"
                >
                  <p className="text-lg pl-2 py-1 font-bold">{translations.about.license}</p>
                </a>
              </div>
              <p className="pt-2 text-center">{translations.about.copyright}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Shortcuts;
