import React, { useEffect, useState } from "react";
import { Note } from "../../store/types";
import CircularProgress from "../UI/ProgressBar";
import icons from "../../lib/remixicon-react";
import {
  useExportiCloud,
  useImportiCloud,
} from "../../utils/iCloud/iCloudUtil";

interface iCloudProps {
  notesState: Record<string, Note>;
  setNotesState: (notes: Record<string, Note>) => void;
}

const iCloudSync: React.FC<iCloudProps> = ({ setNotesState }) => {
  // Translations
  const [translations, setTranslations] = useState({
    icloud: {
      title: "icloud.title",
      import: "icloud.import",
      export: "icloud.export",
      submit: "icloud.submit",
      getToken: "icloud.getToken",
      autoSync: "icloud.Autosync",
      logout: "icloud.logout",
      existingFolder: "icloud.existingFolder",
      refreshingToken: "icloud.refreshingToken",
    },
  });

  useEffect(() => {
    // Load translations
    const loadTranslations = async () => {
      const selectedLanguage = localStorage.getItem("selectedLanguage") || "en";
      try {
        const translationModule = await import(
          `../../assets/locales/${selectedLanguage}.json`
        );

        setTranslations({ ...translations, ...translationModule.default });
      } catch (error) {
        console.error("Error loading translations:", error);
      }
    };

    loadTranslations();
  }, []);

  const {
    exportdata,
    progress: exportProgress,
    progressColor: exportProgressColor,
  } = useExportiCloud();

  const {
    importData,
    progress: importProgress,
    progressColor: importProgressColor,
  } = useImportiCloud(setNotesState);

  const [autoSync, setAutoSync] = useState<boolean>(() => {
    const storedSync = localStorage.getItem("sync");
    return storedSync === "iCloud";
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const storedSync = localStorage.getItem("sync");
      if (storedSync === "iCloud" && !autoSync) {
        setAutoSync(true);
      } else if (storedSync !== "iCloud" && autoSync) {
        setAutoSync(false);
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [autoSync]);

  const handleSyncToggle = () => {
    const syncValue = autoSync ? "none" : "iCloud";
    localStorage.setItem("sync", syncValue);
    setAutoSync(!autoSync);
  };

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
    <div className="sm:flex sm:justify-center sm:items-center sm:h-[80vh]">
      <div className="mx-4 sm:px-20 mb-2 items-center align-center text-center space-y-4">
        <div className="flex justify-center items-center">
          <div className="flex flex-col items-center">
            <p
              className="text-4xl text-center font-bold p-4"
              aria-label={translations.icloud.title || "-"}
            >
              {translations.icloud.title || "-"}
            </p>
            <div className="flex justify-center items-center">
              <CircularProgress
                progress={importProgress || exportProgress}
                color={importProgressColor || exportProgressColor}
                size={144}
                strokeWidth={8}
              >
                {importProgress || exportProgress ? (
                  <span className="text-amber-400 text-xl font-semibold">
                    {importProgress || exportProgress}%
                  </span>
                ) : (
                  <div className="relative bg-neutral-200 dark:bg-[#2D2C2C] bg-opacity-40 rounded-full w-34 h-34 flex justify-center items-center">
                    <icons.iCloud className="w-32 h-32 text-neutral-800 dark:text-neutral-200 p-1" />
                  </div>
                )}
              </CircularProgress>
            </div>
          </div>
        </div>
        <section>
          <div className="flex flex-col">
            <div className="space-y-2">
              <button
                className="bg-neutral-200 dark:text-[color:var(--selected-dark-text)] dark:bg-[#2D2C2C] p-3 bg-opacity-40 w-full text-black p-2 text-lg font-bold rounded-xl"
                onClick={importData}
                aria-label={
                  translations.icloud.import || "Import data from iCloud"
                }
              >
                {translations.icloud.import || "-"}
              </button>
              <button
                className="bg-neutral-200 dark:text-[color:var(--selected-dark-text)] dark:bg-[#2D2C2C] bg-opacity-40 w-full text-black p-3 text-lg font-bold rounded-xl"
                onClick={exportdata}
                aria-label={
                  translations.icloud.export || "Export data to iCloud"
                }
              >
                {translations.icloud.export || "-"}
              </button>
            </div>
          </div>
          <div className="flex items-center py-2 justify-between">
            <div>
              <p
                className="block text-lg align-left"
                aria-label={translations.icloud.autoSync || "Auto Sync"}
              >
                {translations.icloud.autoSync || "-"}
              </p>
            </div>
            <label
              className="relative inline-flex cursor-pointer items-center"
              aria-label={translations.icloud.autoSync || "Toggle auto sync"}
            >
              <input
                id="switch"
                type="checkbox"
                checked={autoSync}
                onChange={handleSyncToggle}
                className="peer sr-only"
                aria-checked={autoSync}
                aria-labelledby="Auto sync"
              />
              <div className="peer h-8 w-[3.75rem] rounded-full border dark:border-[#353333] dark:bg-[#353333] after:absolute after:left-[2px] rtl:after:right-[22px] after:top-0.5 after:h-7 after:w-7 after:rounded-full after:border after:border-neutral-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-amber-400 peer-checked:after:translate-x-full rtl:peer-checked:after:border-white peer-focus:ring-green-300"></div>
            </label>
          </div>
        </section>
      </div>
    </div>
  );
};

export default iCloudSync;
