import React, { useState, useEffect } from "react";
import { Plugins } from "@capacitor/core";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";
import icons from "../../lib/remixicon-react";
import CircularProgress from "../UI/ProgressBar";
import { Note } from "../../store/types";
import {
  useExport,
  useImportOneDrive,
} from "../../utils/Onedrive/oneDriveUtil";

const { MsAuthPlugin } = Plugins;

interface OneDriveProps {
  setNotesState: (notes: Record<string, Note>) => void;
}

const OneDriveAuth: React.FC<OneDriveProps> = ({ setNotesState }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const loadToken = async () => {
      const { value } = await SecureStoragePlugin.get({
        key: "onedrive_access_token",
      });

      if (value) {
        setAccessToken(value);
      }
    };
    loadToken();
  }, []);

  const decodeJwt = (token:string) => {
    try {
      const payload = token.split(".")[1]; // Extract the payload part of the JWT
      const decodedPayload = atob(payload); // Decode base64 string
      return JSON.parse(decodedPayload); // Parse the JSON
    } catch (error) {
      console.error("Failed to decode JWT:", error);
      return null;
    }
  };

  const login = async () => {
    try {
      const result = await MsAuthPlugin.login({
        clientId: import.meta.env.VITE_ONEDRIDE_CLIENT_ID,
        tenant: "common",
        keyHash: import.meta.env.VITE_ONEDRIVE_ANDROID_HASH,
        scopes: ["Files.ReadWrite", "User.Read"],
      });

      if (!result || !result.accessToken) {
        throw new Error("Access token not found in login result.");
      }

      setAccessToken(result.accessToken);

      // Decode the JWT to extract the expiration time
      const tokenData = decodeJwt(result.accessToken);
      const expirationTime = tokenData?.exp
        ? tokenData.exp * 1000 // Convert `exp` from seconds to milliseconds
        : Date.now() + 3600 * 1000; // Default to 1 hour if `exp` is missing

      alert(new Date(expirationTime));

      // Save the access token and expiration time to secure storage
      await SecureStoragePlugin.set({
        key: "onedrive_access_token",
        value: result.accessToken,
      });

      await SecureStoragePlugin.set({
        key: "onedrive_expiration_time",
        value: expirationTime.toString(),
      });
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const logout = async () => {
    try {
      setAccessToken(null);
      await MsAuthPlugin.logout({
        clientId: import.meta.env.VITE_ONEDRIDE_CLIENT_ID,
        tenant: "common",
        keyHash: import.meta.env.VITE_ONEDRIDE_ANDROID_HASH,
      });
      await SecureStoragePlugin.remove({ key: "onedrive_access_token" });
      console.log("Logged out successfully");
    } catch (error) {
      console.error("Logout failed:", error);
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

  // Translations
  const [translations, setTranslations] = useState({
    onedrive: {
      title: "onedrive.title",
      import: "onedrive.import",
      export: "onedrive.export",
      autoSync: "onedrive.Autosync",
      logout: "onedrive.logout",
      login: "onedrive.login",
      existingFolder: "onedrive.existingFolder",
      refreshingToken: "onedrive.refreshingToken",
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

  const [autoSync, setAutoSync] = useState<boolean>(() => {
    const storedSync = localStorage.getItem("sync");
    return storedSync === "onedrive";
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const storedSync = localStorage.getItem("sync");
      if (storedSync === "onedrive" && !autoSync) {
        setAutoSync(true);
      } else if (storedSync !== "onedrive" && autoSync) {
        setAutoSync(false);
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [autoSync]);

  const handleSyncToggle = () => {
    const syncValue = autoSync ? "none" : "onedrive";
    localStorage.setItem("sync", syncValue);
    setAutoSync(!autoSync);
  };

  const {
    exportData,
    progress: exportProgress,
    progressColor: exportProgressColor,
  } = useExport(darkMode);

  const {
    importData,
    progress: importProgress,
    progressColor: importProgressColor,
  } = useImportOneDrive(darkMode, setNotesState);

  return (
    <div className="sm:flex sm:justify-center sm:items-center sm:h-[80vh]">
      <div className="mx-4 sm:px-20 mb-2 items-center align-center text-center space-y-4">
        <div className="flex justify-center items-center">
          <div className="flex flex-col items-center">
            <p
              className="text-4xl text-center font-bold p-4"
              aria-label={translations.onedrive.title || "-"}
            >
              {translations.onedrive.title || "-"}
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
                    <icons.OneDrive className="w-32 h-32 text-neutral-800 dark:text-neutral-200 p-1" />
                  </div>
                )}
              </CircularProgress>
            </div>
          </div>
        </div>
        {accessToken ? (
          <>
            <section>
              <div className="flex flex-col">
                <div className="space-y-2">
                  <button
                    className="bg-neutral-200 dark:text-[color:var(--selected-dark-text)] dark:bg-[#2D2C2C] p-3 bg-opacity-40 w-full text-black p-2 text-lg font-bold rounded-xl"
                    onClick={importData}
                    aria-label={
                      translations.onedrive.import ||
                      "Import data from OneDrive"
                    }
                  >
                    {translations.onedrive.import || "-"}
                  </button>
                  <button
                    className="bg-neutral-200 dark:text-[color:var(--selected-dark-text)] dark:bg-[#2D2C2C] bg-opacity-40 w-full text-black p-3 text-lg font-bold rounded-xl"
                    onClick={exportData}
                    aria-label={
                      translations.onedrive.export || "Export data to OneDrive"
                    }
                  >
                    {translations.onedrive.export || "-"}
                  </button>
                  <button
                    className="bg-neutral-200 dark:text-[color:var(--selected-dark-text)] dark:bg-[#2D2C2C] bg-opacity-40 w-full text-black p-3 text-lg font-bold rounded-xl"
                    onClick={logout}
                    aria-label={
                      translations.onedrive.logout || "Logout from OneDrive"
                    }
                  >
                    {translations.onedrive.logout || "-"}
                  </button>
                </div>
              </div>
              <div className="flex items-center py-2 justify-between">
                <div>
                  <p
                    className="block text-lg align-left"
                    aria-label={translations.onedrive.autoSync || "Auto Sync"}
                  >
                    {translations.onedrive.autoSync || "-"}
                  </p>
                </div>
                <label
                  className="relative inline-flex cursor-pointer items-center"
                  aria-label={
                    translations.onedrive.autoSync || "Toggle auto sync"
                  }
                >
                  <input
                    id="switch"
                    type="checkbox"
                    checked={autoSync}
                    onChange={handleSyncToggle}
                    className="peer sr-only"
                    aria-checked={autoSync}
                    aria-labelledby="auto-sync-toggle"
                  />
                  <div className="peer h-8 w-[3.75rem] rounded-full border dark:border-[#353333] dark:bg-[#353333] after:absolute after:left-[2px] rtl:after:right-[22px] after:top-0.5 after:h-7 after:w-7 after:rounded-full after:border after:border-neutral-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-amber-400 peer-checked:after:translate-x-full rtl:peer-checked:after:border-white peer-focus:ring-green-300"></div>
                </label>
              </div>
            </section>
          </>
        ) : (
          <>
            <section>
              <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                <div className="space-y-4">
                  <button
                    className="bg-amber-400 w-full text-white p-3 text-xl font-bold rounded-xl"
                    onClick={login}
                    aria-label={
                      translations.onedrive.login || "Login to OneDrive"
                    }
                  >
                    {translations.onedrive.login || "-"}
                  </button>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default OneDriveAuth;
