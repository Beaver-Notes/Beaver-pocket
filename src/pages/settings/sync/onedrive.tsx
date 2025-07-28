import React, { useState, useEffect } from "react";
import { MsAuthPlugin } from "@recognizebv/capacitor-plugin-msauth";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";
import Icon from "@/components/ui/Icon";
import { OneDriveAPI } from "@/utils/Onedrive/oneDriveApi";
import { useTranslation } from "@/utils/translations";
import { forceSyncNow } from "@/composable/sync";

interface OneDriveProps {
  syncStatus: string;
  disableClass?: boolean,
}

const OneDriveAuth: React.FC<OneDriveProps> = ({ syncStatus, disableClass }) => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const SYNC_FOLDER_NAME = "BeaverNotesSync";

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

  const decodeJwt = (token: string) => {
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
        clientId: import.meta.env.VITE_ONEDRIVE_ANDROID_HASH,
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

      const onedrive = new OneDriveAPI(result.accessToken);

      // Check if folder exists, otherwise create it
      try {
        await onedrive.filesGetMetadata(`/${SYNC_FOLDER_NAME}`);
      } catch (error: any) {
        if (error.status === 409) {
          // Folder doesn't exist, create it
          await onedrive.createFolder(`/${SYNC_FOLDER_NAME}`);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const logout = async () => {
    try {
      setAccessToken(null);
      await MsAuthPlugin.logout({
        clientId: import.meta.env.VITE_ONEDRIVE_ANDROID_HASH,
        tenant: "common",
        keyHash: import.meta.env.VITE_ONEDRIVE_ANDROID_HASH,
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
  const [translations, setTranslations] = useState<Record<string, any>>({
    onedrive: {},
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
    <div
      className={`w-full sm:flex sm:justify-center sm:items-center ${
        !disableClass ? "sm:h-[80vh]" : ""
      } space-y-4`}
    >
      <div
        className={`w-full max-w-xl ${
          !disableClass ? "sm:px-20" : ""
        } px-4 sm:px-20 mb-2 text-center`}
      >
        <p className="text-4xl text-left font-bold p-4" aria-label="onedrive">
          Onedrive
        </p>
        <div className="flex justify-center items-center">
          <div className="relative bg-opacity-40 rounded-full w-34 h-34 flex justify-center items-center">
            <Icon
              name="OneDrive"
              className={`w-32 h-32 ${getIconClass(
                ["syncing", "idle", "error"].includes(syncStatus)
                  ? (syncStatus as "syncing" | "idle" | "error")
                  : "idle"
              )}`}
            />
          </div>
        </div>
        {accessToken ? (
          <>
            <section>
              <div className="flex flex-col">
                <div className="space-y-2">
                  <button
                    className="bg-neutral-200 dark:text-[color:var(--selected-dark-text)] dark:bg-[#2D2C2C] bg-opacity-40 w-full text-black p-3 text-lg font-bold rounded-xl"
                    onClick={logout}
                    aria-label={
                      translations.onedrive.logout || "Logout from OneDrive"
                    }
                  >
                    {translations.onedrive.logout || "-"}
                  </button>
                  <button
                    className="bg-neutral-200 dark:text-[color:var(--selected-dark-text)] dark:bg-[#2D2C2C] bg-opacity-40 w-full text-black p-3 text-lg font-bold rounded-xl"
                    onClick={forceSyncNow}
                    aria-label={translations.onedrive.sync}
                  >
                    {translations.drive.sync || "-"}
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
                  <div className="peer h-8 w-[3.75rem] rounded-full border dark:border-[#353333] dark:bg-[#353333] after:absolute after:left-[2px] rtl:after:right-[22px] after:top-0.5 after:h-7 after:w-7 after:rounded-full after:border after:border-neutral-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full rtl:peer-checked:after:border-white peer-focus:ring-green-300"></div>
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
                    className="bg-primary w-full text-white p-3 text-xl font-bold rounded-xl"
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
