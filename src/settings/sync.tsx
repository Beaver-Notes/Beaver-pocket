import React, { useState, useEffect } from "react";
import { isPlatform } from "@ionic/react";
import { Note } from "../store/types";
import dayjs from "dayjs";
import { useExportData } from "../utils/exportUtils";
import { useHandleImportData } from "../utils/importUtils";
import { Link } from "react-router-dom";
import icons from "../lib/remixicon-react";
import { loadNotes } from "../store/notes";

interface SyncProps {
  notesState: Record<string, Note>;
  setNotesState: (notes: Record<string, Note>) => void;
}

const Sync: React.FC<SyncProps> = ({ notesState, setNotesState }) => {
  // Correctly destructuring props
  const { exportUtils } = useExportData();
  const { importUtils } = useHandleImportData();

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

  const exportData = () => {
    exportUtils(notesState); // Pass notesState as an argument
  };

  const handleImportData = () => {
    importUtils(setNotesState, loadNotes); // Pass notesState as an argument
  };

  // @ts-ignore
  const [sortingOption, setSortingOption] = useState("updatedAt");

  // Translations
  const [translations, setTranslations] = useState({
    sync: {
      Dropbox: "sync.Dropbox",
      Webdav: "sync.Webdav",
      importData: "sync.importData",
      exportData: "sync.exportData",
      exportError: "sync.exportError",
      shareError: "sync.shareError",
      encryptwPasswd: "sync.encryptwPasswd",
      importSuccess: "sync.importSuccess",
      importInvalid: "sync.importInvalid",
      Sync: "sync.Sync",
      iCloud: "sync.iCloud",
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

  return (
    <div>
      <div className="grid sm:grid-cols-[auto]">
        <div className="overflow-y-hidden mb-12">
          <div className="mx-6 md:px-24 pb-8 overflow-y-auto flex-grow">
            <div className="general py-2 space-y-8 w-full">
              <div className="general space-y-3 w-full">
                <p className="text-4xl font-bold">
                  {" "}
                  {translations.sync.Sync || "-"}
                </p>
                <div className="flex flex-col gap-2 pt-2">
                  <Link
                    className="w-full p-4 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl inline-flex items-center"
                    to="/dropbox"
                  >
                    <icons.DropboxFillIcon className="w-10 h-10" />
                    <p className="text-2xl pl-2 py-1 font-bold">Dropbox</p>
                  </Link>
                  <Link
                    className="w-full p-4 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl inline-flex items-center"
                    to="/webdav"
                  >
                    <icons.ServerLineIcon className="w-10 h-10" />
                    <p className="text-2xl pl-2 py-1 font-bold">Webdav</p>
                  </Link>
                  <Link
                    className={`w-full p-4 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl inline-flex items-center ${
                      isPlatform("android") ? "hidden" : ""
                    }`}
                    to="/icloud"
                  >
                    <icons.iCloud className="w-10 h-10" />
                    <p className="text-2xl pl-2 py-1 font-bold">iCloud</p>
                  </Link>
                  <Link
                    className="w-full p-4 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl inline-flex items-center"
                    to="/gdrive"
                  >
                    <icons.GDrive className="w-10 h-10" />
                    <p className="text-2xl pl-2 py-1 font-bold">Google Drive</p>
                  </Link>
                  <Link
                    className="w-full p-4 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl inline-flex items-center"
                    to="/onedrive"
                  >
                    <icons.OneDrive className="w-10 h-10" />
                    <p className="text-2xl pl-2 py-1 font-bold">OneDrive</p>
                  </Link>
                </div>
                <div className="relative pt-2 gap-1 flex flex-col sm:flex-row">
                  <div className="sm:w-1/2 mb-2 w-full p-4 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl items-center">
                    <div className="flex items-center justify-center w-20 h-20 bg-[#E6E6E6] dark:bg-[#383737] rounded-full mx-auto">
                      <icons.FileDownloadLineIcon className="w-12 h-12 text-neutral-800 dark:text-neutral-300" />
                    </div>
                    <div className="bottom-0">
                      <button
                        className="w-full mt-2 rounded-xl p-2 bg-[#E6E6E6] dark:bg-[#383737]"
                        onClick={handleImportData}
                      >
                        {translations.sync.importData || "-"}
                      </button>
                    </div>
                  </div>

                  <div className="sm:w-1/2 mb-2 w-full p-4 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl items-center">
                    <div className="flex items-center justify-center w-20 h-20 bg-[#E6E6E6] dark:bg-[#383737] rounded-full mx-auto">
                      <icons.FileUploadLineIcon className="w-12 h-12 text-neutral-800 dark:text-neutral-300" />
                    </div>
                    <div className="flex items-center pt-2">
                      <input type="checkbox" />
                      <span className="ml-2">
                        {translations.sync.encryptwPasswd || "-"}
                      </span>
                    </div>

                    <button
                      className="w-full mt-2 rounded-xl p-2 bg-[#E6E6E6] dark:bg-[#383737]"
                      onClick={exportData}
                    >
                      {translations.sync.exportData || "-"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sync;
