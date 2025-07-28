import React, { useEffect, useState } from "react";
import Icon from "@/components/ui/Icon";
import { useTranslation } from "@/utils/translations";
import iCloud from "@/utils/iCloud/iCloud";
import { forceSyncNow } from "@/composable/sync";

interface iCloudProps {
  syncStatus: string;
}

const SYNC_FOLDER_NAME = "BeaverNotesSync";

const iCloudSync: React.FC<iCloudProps> = ({ syncStatus }) => {
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

  const handleSyncToggle = async () => {
    const syncValue = autoSync ? "none" : "iCloud";
    localStorage.setItem("sync", syncValue);
    setAutoSync(!autoSync);
    const { exists } = await iCloud.checkFolderExists({
      folderName: `${SYNC_FOLDER_NAME}`,
    });
    if (!exists) {
      await iCloud.createFolder({ folderName: `${SYNC_FOLDER_NAME}` });
    }
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

  const getIconClass = (status: "syncing" | "idle" | "error") => {
    switch (status) {
      case "syncing":
        return "text-neutral-800 dark:text-neutral-200 animate-pulse";
      case "idle":
        return "text-neutral-800 dark:text-neutral-200";
      case "error":
        return "text-red-500";
      default:
        return "text-neutral-800 dark:text-neutral-200";
    }
  };

  return (
    <div className="sm:flex sm:justify-center sm:items-center sm:h-[80vh]">
      <div className="mx-4 sm:px-20 mb-2 items-center align-center text-center space-y-4">
        <section>
          <div className="flex flex-col">
            <div className="space-y-2">
              <p
                className="text-4xl text-left font-bold p-4"
                aria-label="Webdav"
              >
                Webdav
              </p>
              <div className="flex justify-center items-center">
                <div className="relative bg-opacity-40 rounded-full w-34 h-34 flex justify-center items-center">
                  <Icon
                    name="CloudLine"
                    className={`w-32 h-32 ${getIconClass(
                      ["syncing", "idle", "error"].includes(syncStatus)
                        ? (syncStatus as "syncing" | "idle" | "error")
                        : "idle"
                    )}`}
                  />
                </div>
              </div>
              {securityWarning && (
                <div className="text-red-600 dark:text-red-400 text-sm font-medium px-4">
                  {securityWarning}
                </div>
              )}
              <input
                type="text"
                className="w-full p-3 dark:bg-neutral-800 border dark:border-neutral-600 dark:focus:border-primary focus:border-primary focus:outline-none focus:border-secondary border-2 p-2 rounded-xl pr-10"
                value={baseUrl}
                placeholder="https://server.example"
                onChange={(e) => setBaseUrl(e.target.value)}
                aria-label={translations.accessibility.webdavUrl}
              />
              <input
                type="text"
                className="w-full p-3 dark:bg-neutral-800 border dark:border-neutral-600 dark:focus:border-primary focus:border-primary focus:outline-none focus:border-secondary border-2 p-2 rounded-xl pr-10"
                placeholder={translations.webdav.username}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                aria-label={translations.webdav.username}
              />
              <div className="relative">
                <input
                  className="w-full p-3 dark:bg-neutral-800 border dark:border-neutral-600 dark:focus:border-primary focus:border-primary focus:outline-none focus:border-secondary border-2 p-2 rounded-xl pr-10"
                  type={showInputContent ? "text" : "password"}
                  placeholder={translations.webdav.password}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-label={translations.webdav.password}
                />
                <button
                  onClick={toggleInputContentVisibility}
                  className="absolute right-0 py-2.5 text-sm dark:text-[color:var(--selected-dark-text)] text-neutral-500 focus:outline-none"
                  aria-label={
                    showInputContent
                      ? translations.accessibility.hidePasswd
                      : translations.accessibility.showPasswd
                  }
                >
                  {showInputContent ? (
                    <Icon name="EyeLine" className="w-8 h-8 mr-2" />
                  ) : (
                    <Icon name="EyeCloseLine" className="w-8 h-8 mr-2" />
                  )}
                </button>
              </div>
              <button
                className="bg-neutral-200 dark:text-[color:var(--selected-dark-text)] dark:bg-[#2D2C2C] bg-opacity-40 w-full text-black p-3 text-lg font-bold rounded-xl"
                onClick={login}
                aria-label={translations.webdav.login}
              >
                {translations.webdav.login || "-"}
              </button>
              {logged && (
                <div className="flex flex-col space-y-4 py-2">
                  <button
                    className="bg-neutral-200 dark:text-[color:var(--selected-dark-text)] dark:bg-[#2D2C2C] bg-opacity-40 w-full text-black p-3 text-lg font-bold rounded-xl"
                    onClick={forceSyncNow}
                    aria-label={translations.webdav.sync}
                  >
                    {translations.webdav.sync || "-"}
                  </button>
                  {/* Auto Sync */}
                  <div className="flex items-center justify-between">
                    <p
                      className="text-lg"
                      aria-label={translations.webdav.autoSync}
                      id="auto-sync-label"
                    >
                      {translations.webdav.autoSync || "-"}
                    </p>
                    <label
                      htmlFor="auto-sync-switch"
                      className="relative inline-flex cursor-pointer items-center"
                      aria-label={translations.webdav.autoSync}
                    >
                      <input
                        id="auto-sync-switch"
                        type="checkbox"
                        checked={autoSync}
                        onChange={handleSyncToggle}
                        className="peer sr-only"
                        aria-checked={autoSync}
                        aria-labelledby="auto-sync-label"
                      />
                      <div
                        className="peer h-8 w-[3.75rem] rounded-full border dark:border-[#353333] dark:bg-[#353333]
        after:absolute after:left-[2px] rtl:after:right-[22px] after:top-0.5 after:h-7 after:w-7
        after:rounded-full after:border after:border-neutral-300 after:bg-white after:transition-all
        after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full rtl:peer-checked:after:border-white
        peer-focus:ring-green-300"
                      ></div>
                    </label>
                  </div>

                  <div className="w-full">
                    <button
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      aria-expanded={showAdvanced}
                      aria-controls="advanced-settings"
                      className="flex items-center justify-between w-full"
                    >
                      <span>Advanced Settings</span>
                      {showAdvanced ? (
                        <Icon name="ArrowUpSLine" className="w-6 h-6 ml-2" />
                      ) : (
                        <Icon name="ArrowDownSLine" className="w-6 h-6 ml-2" />
                      )}
                    </button>
                  </div>

                  {/* Advanced Settings Section */}
                  {showAdvanced && (
                    <div
                      id="advanced-settings"
                      className="flex flex-col space-y-4"
                    >
                      {/* Insecure Mode */}
                      <div className="flex items-center justify-between">
                        <p
                          className="text-lg"
                          aria-label={translations.webdav.insecureMode}
                          id="insecure-mode-label"
                        >
                          {translations.webdav.insecureMode || "-"}
                        </p>
                        <label
                          htmlFor="insecure-mode-switch"
                          className="relative inline-flex cursor-pointer items-center"
                          aria-label={translations.webdav.insecureMode}
                        >
                          <input
                            id="insecure-mode-switch"
                            type="checkbox"
                            checked={insecureMode}
                            onChange={handleInsecureToggle}
                            className="peer sr-only"
                            aria-checked={insecureMode}
                            aria-labelledby="insecure-mode-label"
                          />
                          <div
                            className="peer h-8 w-[3.75rem] rounded-full border dark:border-[#353333] dark:bg-[#353333]
            after:absolute after:left-[2px] rtl:after:right-[22px] after:top-0.5 after:h-7 after:w-7
            after:rounded-full after:border after:border-neutral-300 after:bg-white after:transition-all
            after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full rtl:peer-checked:after:border-white
            peer-focus:ring-green-300"
                          ></div>
                        </label>
                      </div>

                      {/* File Upload */}
                      <label className="bg-neutral-200 dark:text-[color:var(--selected-dark-text)] dark:bg-[#2D2C2C] bg-opacity-40 w-full text-black p-3 text-lg font-bold rounded-xl">
                        Upload Certificate
                        <input
                          type="file"
                          accept=".crt,.pem,.cer,.der"
                          onChange={handleUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default iCloudSync;
