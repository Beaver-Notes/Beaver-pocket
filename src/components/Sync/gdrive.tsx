import React, { useEffect, useState } from "react";
import { SocialLogin } from "@capgo/capacitor-social-login";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";
import { GoogleDriveAPI } from "../../utils/Google Drive/GoogleDriveAPI";
import icons from "../../lib/remixicon-react";
import CircularProgress from "../UI/ProgressBar";
import { Note } from "../../store/types";
import { useDriveImport, useExport } from "../../utils/Google Drive/GDriveUtil";

interface GdriveProps {
  setNotesState: (notes: Record<string, Note>) => void;
}

const WEB_CLIENT_ID = import.meta.env.VITE_WEB_GOOGLE_CLIENT_ID; // Web Client ID for all platforms
const IOS_CLIENT_ID = import.meta.env.VITE_IOS_GOOGLE_CLIENT_ID; // iOS-specific Client ID

const GoogleDriveExportPage: React.FC<GdriveProps> = ({ setNotesState }) => {
  const [user, setUser] = useState<any | null>(null);
  
  useEffect(() => {
    const initializeGoogleAuth = async () => {
      try {
        await SocialLogin.initialize({
          google: {
            webClientId: WEB_CLIENT_ID,
            iOSClientId: IOS_CLIENT_ID,
            mode: "online",
          },
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
      const result = await SecureStoragePlugin.get({
        key: "google_access_token",
      });
      if (result.value) {
        const isValid = await validateAccessToken(result.value);
        if (isValid) {
          const userInfo = await SocialLogin.login({
            provider: "google",
            options: {
              scopes: [
                "profile",
                "email",
                "https://www.googleapis.com/auth/drive",
              ],
              forceRefreshToken: true,
            },
          });
          setUser({
            //@ts-ignore
            ...userInfo.result.profile,
            authentication: { accessToken: result.value },
          });
        }
      }
    } catch (error) {
      console.log("No valid access token found in secure storage.");
    }
  };

  const Login = async () => {
    try {
      const res = await SocialLogin.login({
        provider: "google",
        options: {
          scopes: ["profile", "email", "https://www.googleapis.com/auth/drive"],
          forceRefreshToken: true,
        },
      });
      const { result } = res;
      //@ts-ignore
      if (result.accessToken?.token) {
        //@ts-ignore
        setUser(result.profile);
        //@ts-ignore
        setDriveAPI(new GoogleDriveAPI(result.accessToken.token));
        //@ts-ignore
        saveAccessToken(result.accessToken.token);
      }
    } catch (err) {
      console.error("Google Sign-In Error:", err);
    }
  };

  const saveAccessToken = async (token: string) => {
    try {
      await SecureStoragePlugin.set({
        key: "google_access_token",
        value: token,
      });
      console.log("Access token saved to secure storage.");
    } catch (error) {
      console.error("Error saving access token:", error);
    }
  };

  const validateAccessToken = async (token: string) => {
    try {
      const response = await fetch(
        `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`
      );
      return response.ok;
    } catch (error) {
      console.error("Error validating access token:", error);
      return false;
    }
  };

  const Logout = async () => {
    try {
      await SocialLogin.logout({ provider: "google" });
      setUser(null);
      await SecureStoragePlugin.remove({ key: "google_access_token" });
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
