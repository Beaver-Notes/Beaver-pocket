import React, { useEffect, useState } from "react";
import { Note } from "@/store/types";
import Icon from "@/components/UI/Icon";
import { useTranslation } from "@/utils/translations";
interface iCloudProps {
  notesState: Record<string, Note>;
  setNotesState: (notes: Record<string, Note>) => void;
}

const iCloudSync: React.FC<iCloudProps> = () => {
  // Translations
  const [translations, setTranslations] = useState<Record<string, any>>({
    icloud: {},
    sync: {},
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
        <p className="text-4xl text-left font-bold p-4" aria-label="icloud">
          iCloud
        </p>
        <div className="flex justify-center items-center">
          <div className="relative bg-opacity-40 rounded-full w-34 h-34 flex justify-center items-center">
            <Icon
              name="iCloud"
              className="w-32 h-32 text-neutral-800 dark:text-neutral-200"
            />
          </div>
        </div>
        <section>
          <div className="flex flex-col">
            <div className="space-y-2"></div>
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
              <div className="peer h-8 w-[3.75rem] rounded-full border dark:border-[#353333] dark:bg-[#353333] after:absolute after:left-[2px] rtl:after:right-[22px] after:top-0.5 after:h-7 after:w-7 after:rounded-full after:border after:border-neutral-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full rtl:peer-checked:after:border-white peer-focus:ring-green-300"></div>
            </label>
          </div>
        </section>
      </div>
    </div>
  );
};

export default iCloudSync;
