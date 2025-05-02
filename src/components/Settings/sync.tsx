import React, { useState, useEffect } from "react";
import { isPlatform } from "@ionic/react";
import { Note } from "../../store/types";
import dayjs from "dayjs";
import { useExportData } from "../../utils/exportUtils";
import { useHandleImportData } from "../../utils/importUtils";
import { useNavigate } from "react-router-dom";
import icons from "../../lib/remixicon-react";
import { Filesystem, FilesystemDirectory } from "@capacitor/filesystem";
import { Zip } from "capa-zip";

interface SyncProps {
  notesState: Record<string, Note>;
  setNotesState: (notes: Record<string, Note>) => void;
}

const Sync: React.FC<SyncProps> = ({ notesState, setNotesState }) => {
  // Correctly destructuring props
  const { exportUtils } = useExportData();
  const { importUtils } = useHandleImportData();
  const navigate = useNavigate();

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

  const handleImportData = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (file) {
      const fileReader = new FileReader();
      fileReader.readAsDataURL(file);

      return new Promise((reject) => {
        fileReader.onload = async () => {
          const fileDataUrl = fileReader.result as string;

          // Write file to filesystem under "file-assets/noteId" directory
          const filePath = `export/${file.name}`;
          try {
            await Filesystem.writeFile({
              path: filePath,
              data: fileDataUrl.split(",")[1], // Write only base64 data
              directory: FilesystemDirectory.Data,
              recursive: true,
            });

            await Zip.unzip({
              sourceFile: filePath,
              destinationPath: `export/${file.name.split('.').slice(0, -1).join('.')}`,
            });

            await Filesystem.deleteFile({
              path: filePath,
              directory: FilesystemDirectory.Data,
            });

          } catch (error) {
            console.error("Error writing file to filesystem:", error);
            reject(error); // Reject promise on error
          }
        };

        fileReader.onerror = (error) => {
          console.error("Error reading file:", error);
          reject(error); // Reject promise on error
        };
      });
    }
    importUtils(setNotesState); // Pass notesState as an argument
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
          `../../assets/locales/${selectedLanguage}.json`
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
                  {translations.sync.Sync || "-"}
                </p>
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    className="w-full p-4 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl inline-flex items-center"
                    onClick={() => navigate("/dropbox")}
                    aria-label="Dropbox"
                  >
                    <icons.DropboxFillIcon
                      className="w-10 h-10"
                      aria-hidden="true"
                    />
                    <p className="text-2xl pl-2 py-1 font-bold">Dropbox</p>
                  </button>

                  <button
                    className="w-full p-4 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl inline-flex items-center"
                    onClick={() => navigate("/dav")}
                    aria-label="Webdav"
                  >
                    <icons.CloudLine
                      className="w-10 h-10"
                      aria-hidden="true"
                    />
                    <p className="text-2xl pl-2 py-1 font-bold">Webdav</p>
                  </button>

                  <button
                    className={`w-full p-4 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl inline-flex items-center ${
                      isPlatform("android") ? "hidden" : ""
                    }`}
                    onClick={() => navigate("/icloud")}
                    aria-label="iCloud"
                  >
                    <icons.iCloud className="w-10 h-10" aria-hidden="true" />
                    <p className="text-2xl pl-2 py-1 font-bold">iCloud</p>
                  </button>
                  
                  <button
                    className="w-full p-4 text-xl bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl inline-flex items-center"
                    onClick={() => navigate("/onedrive")}
                    aria-label="OneDrive"
                  >
                    <icons.OneDrive className="w-10 h-10" aria-hidden="true" />
                    <p className="text-2xl pl-2 py-1 font-bold">OneDrive</p>
                  </button>
                </div>

                <div className="flex flex-row gap-2">
                  <div className="flex-1">
                    <label
                      htmlFor="file-upload-input"
                      className="w-full flex items-center justify-center h-20  bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl"
                      aria-label={translations.sync.importData || "-"}
                    >
                      <icons.Download2LineIcon className="w-12 h-12 text-neutral-800 dark:text-neutral-300" />
                    </label>
                    <input
                      type="file"
                      onChange={handleImportData}
                      id="file-upload-input"
                      className="hidden"
                    />
                  </div>
                  <div className="flex-1">
                    <button
                      className="w-full flex items-center justify-center h-20  bg-[#F8F8F7] dark:bg-[#2D2C2C] rounded-xl"
                      onClick={exportData}
                      aria-label={translations.sync.exportData || "-"}
                    >
                      <icons.Upload2LineIcon className="w-12 h-12 text-neutral-800 dark:text-neutral-300" />
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
