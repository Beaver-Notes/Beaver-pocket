import React, { useEffect, useState } from "react";
import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";
import icons from "../../lib/remixicon-react";
import CircularProgress from "../UI/ProgressBar";
import { Note } from "../../store/types";
import { isPlatform } from "@ionic/react";
import { useDriveImport, useExport } from "../../utils/Google Drive/GDriveUtil";

interface GdriveProps {
  setNotesState: (notes: Record<string, Note>) => void;
}

const IOS_CLIENT_ID = import.meta.env.VITE_IOS_GOOGLE_CLIENT_ID;
const ANDROID_CLIENT_ID = import.meta.env.VITE_ANDROID_GOOGLE_CLIENT_ID;

const GoogleDriveExportPage: React.FC<GdriveProps> = ({ setNotesState }) => {
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    const initializeGoogleAuth = async () => {
      try {
        let clientId = "";

        // Determine the platform and select the correct clientId
        if (isPlatform("ios")) {
          clientId = IOS_CLIENT_ID; // iOS Client ID
        } else if (isPlatform("android")) {
          clientId = ANDROID_CLIENT_ID; // Android Client ID
        } else {
          console.error("Platform not supported");
          return;
        }

        await GoogleAuth.initialize({
          clientId: clientId,
          scopes: ["profile", "email", "https://www.googleapis.com/auth/drive"],
          grantOfflineAccess: true,
        });

        await loadAccessToken();
      } catch (error) {
        console.error("Failed to initialize Google Auth:", error);
      }
    };

    initializeGoogleAuth();
  }, []);

  const loadAccessToken = async () => {
    try {
      const result = await SecureStoragePlugin.get({ key: "access_token" });
      if (result.value) {
        const userInfo = await GoogleAuth.refresh(); // Initial refresh
        setUser({ ...userInfo, authentication: { accessToken: result.value } });
        console.log("Access token loaded from secure storage.");
      }
    } catch (error) {
      console.log(
        "No access token found in secure storage or failed to refresh."
      );
    }
  };

  const Login = async () => {
    try {
      const googleUser = await GoogleAuth.signIn();
      console.log("Google User:", googleUser);
      setUser(googleUser);
      saveAccessToken(googleUser.authentication.accessToken);
    } catch (err) {
      console.error("Google Sign-In Error:", err);
    }
  };

  const saveAccessToken = async (token: string) => {
    try {
      await SecureStoragePlugin.set({ key: "access_token", value: token });
      console.log("Access token saved to secure storage.");
    } catch (error) {
      console.error("Error saving access token:", error);
    }
  };

  const Logout = async () => {
    try {
      await GoogleAuth.signOut();
      setUser(null);
      await SecureStoragePlugin.remove({ key: "access_token" });
    } catch (err) {
      console.error("Error signing out:", err);
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

  const {
    exportdata,
    progress: exportProgress,
    progressColor: exportProgressColor,
  } = useExport(darkMode);

  const {
    importData,
    progress: importProgress,
    progressColor: importProgressColor,
  } = useDriveImport(darkMode, setNotesState);

  const [autoSync, setAutoSync] = useState<boolean>(() => {
    const storedSync = localStorage.getItem("sync");
    return storedSync === "googledrive";
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const storedSync = localStorage.getItem("sync");
      if (storedSync === "googledrive" && !autoSync) {
        setAutoSync(true);
      } else if (storedSync !== "googledrive" && autoSync) {
        setAutoSync(false);
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [autoSync]);

  const handleSyncToggle = () => {
    const syncValue = autoSync ? "none" : "googledrive";
    localStorage.setItem("sync", syncValue);
    setAutoSync(!autoSync);
  };

  // Translations
  const [translations, setTranslations] = useState({
    gdrive: {
      title: "gdrive.title",
      import: "gdrive.import",
      export: "gdrive.export",
      autoSync: "gdrive.Autosync",
      logout: "gdrive.logout",
      login: "gdrive.login",
      existingFolder: "gdrive.existingFolder",
      refreshingToken: "gdrive.refreshingToken",
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

  return (
    <div className="sm:flex sm:justify-center sm:items-center sm:h-[80vh]">
      <div className="mx-4 sm:px-20 mb-2 items-center align-center text-center space-y-4">
        <div className="flex justify-center items-center">
          <div className="flex flex-col items-center">
            <p
              className="text-4xl text-center font-bold p-4"
              aria-label={translations.gdrive.title || "-"}
            >
              {translations.gdrive.title || "-"}
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
                    <icons.GDrive className="w-32 h-32 text-neutral-800 dark:text-neutral-200 p-1" />
                  </div>
                )}
              </CircularProgress>
            </div>
          </div>
        </div>
        {user ? (
          <section>
            <div className="flex flex-col">
              <div className="space-y-2">
                <button
                  className="bg-neutral-200 dark:text-[color:var(--selected-dark-text)] dark:bg-[#2D2C2C] p-3 bg-opacity-40 w-full text-black p-2 text-lg font-bold rounded-xl"
                  onClick={importData}
                  aria-label={
                    translations.gdrive.import ||
                    "Import data from Google Drive"
                  }
                >
                  {translations.gdrive.import || "-"}
                </button>
                <button
                  className="bg-neutral-200 dark:text-[color:var(--selected-dark-text)] dark:bg-[#2D2C2C] bg-opacity-40 w-full text-black p-3 text-lg font-bold rounded-xl"
                  onClick={exportdata}
                  aria-label={
                    translations.gdrive.export || "Export data to Google Drive"
                  }
                >
                  {translations.gdrive.export || "-"}
                </button>
                <button
                  className="bg-neutral-200 dark:text-[color:var(--selected-dark-text)] dark:bg-[#2D2C2C] bg-opacity-40 w-full text-black p-3 text-lg font-bold rounded-xl"
                  onClick={Logout}
                  aria-label={
                    translations.gdrive.logout || "Logout from Google Drive"
                  }
                >
                  {translations.gdrive.logout || "-"}
                </button>
              </div>
            </div>
            <div className="flex items-center py-2 justify-between">
              <div>
                <p
                  className="block text-lg align-left"
                  aria-label={translations.gdrive.autoSync || "Auto Sync"}
                >
                  {translations.gdrive.autoSync || "-"}
                </p>
              </div>
              <label
                className="relative inline-flex cursor-pointer items-center"
                aria-label={translations.gdrive.autoSync || "Toggle auto sync"}
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
        ) : (
          <>
            <section>
              <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                <div className="space-y-4">
                  <button
                    className="bg-amber-400 w-full text-white p-3 text-xl font-bold rounded-xl"
                    onClick={Login}
                    aria-label={
                      translations.gdrive.login || "Login to Google Drive"
                    }
                  >
                    {translations.gdrive.login || "-"}
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

export default GoogleDriveExportPage;
