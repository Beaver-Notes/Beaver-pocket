import React, { useEffect, useState } from "react";
import { driveService } from "@/utils/Google Drive/GoogleOauth";
import Icon from "@/components/ui/Icon";
import { useTranslation } from "@/utils/translations";
import { forceSyncNow } from "@/utils/sync";

interface DriveProps {
  syncStatus: string;
  disableClass?: boolean;
}

const GoogleDrive: React.FC<DriveProps> = ({ syncStatus, disableClass }) => {
  const SYNC_FOLDER_NAME = "BeaverNotesSync";
  const [user, setUser] = useState<any | null>(null);
  const [autoSync, setAutoSync] = useState(
    () => localStorage.getItem("sync") === "googledrive"
  );
  const [translations, setTranslations] = useState<Record<string, any>>({
    gdrive: {},
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

  // Initialize driveService on mount and sync user state
  useEffect(() => {
    const init = async () => {
      try {
        await driveService.initialize();
        if (driveService.isAuthenticated()) {
          setUser({
            authentication: {
              accessToken: driveService.getAccessToken(),
            },
          });
        }
      } catch (e) {
        console.error("DriveService init failed:", e);
      }
    };
    init();
  }, []);

  // Login handler using driveService
  const Login = async () => {
    try {
      await driveService.signIn();
      const driveAPI = driveService.getDriveAPI();
      if (driveAPI) {
        setUser({
          authentication: { accessToken: driveService.getAccessToken() },
        });
        let folderId = await driveAPI.checkFolderExists(SYNC_FOLDER_NAME);
        if (!folderId) {
          folderId = await driveAPI.createFolder(SYNC_FOLDER_NAME);
          if (!folderId) throw new Error("Failed to create sync folder");
        }
      }
    } catch (err) {
      console.error("Google Sign-In Error:", err);
    }
  };

  // Logout handler using driveService
  const Logout = async () => {
    try {
      await driveService.signOut();
      setUser(null);
      console.log("User signed out.");
    } catch (err) {
      console.error("Sign-out error:", err);
    }
  };

  // Toggle sync mode and store in localStorage
  const handleSyncToggle = () => {
    const newValue = autoSync ? "none" : "googledrive";
    localStorage.setItem("sync", newValue);
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
      className={`sm:flex sm:justify-center sm:items-center ${
        !disableClass ? "sm:h-[80vh]" : ""
      }`}
    >
      <div
        className={`mx-4 ${
          !disableClass ? "sm:px-20" : ""
        } mb-2 items-center align-center text-center space-y-4`}
      >
        <p className="text-4xl font-bold p-4">Drive</p>
        <div className="flex flex-col items-center">
          <div className="relative bg-opacity-40 rounded-full w-34 h-34 flex justify-center items-center">
            <Icon
              name="GDrive"
              className={`w-32 h-32 ${getIconClass(
                ["syncing", "idle", "error"].includes(syncStatus)
                  ? (syncStatus as "syncing" | "idle" | "error")
                  : "idle"
              )}`}
            />
          </div>
        </div>
        {user ? (
          <section className="space-y-2">
            <button
              className="bg-neutral-50 dark:text-[color:var(--selected-dark-text)] dark:bg-[#2D2C2C] w-full text-black p-3 text-lg font-bold rounded-xl"
              onClick={Logout}
            >
              {translations.gdrive.logout || "Logout"}
            </button>{" "}
            <button
              className="bg-neutral-50 dark:text-[color:var(--selected-dark-text)] dark:bg-[#2D2C2C] w-full text-black p-3 text-lg font-bold rounded-xl"
              onClick={forceSyncNow}
              aria-label={translations.gdrive.sync}
            >
              {translations.gdrive.sync || "-"}
            </button>
            <div className="flex items-center py-2 justify-between">
              <p className="text-lg">{translations.gdrive.autoSync || "-"}</p>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  id="switch"
                  type="checkbox"
                  checked={autoSync}
                  onChange={handleSyncToggle}
                  className="peer sr-only"
                />
                <div className="peer h-8 w-[3.75rem] rounded-full border dark:border-[#353333] dark:bg-[#353333] after:absolute after:left-[2px] after:top-0.5 after:h-7 after:w-7 after:rounded-full after:border after:border-neutral-300 after:bg-white after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full"></div>
              </label>
            </div>
          </section>
        ) : (
          <section>
            <div className="sm:mx-auto sm:w-full sm:max-w-sm space-y-4">
              <button
                className="bg-primary w-full text-white p-3 text-xl font-bold rounded-xl"
                onClick={Login}
              >
                {translations.gdrive.login || "Login with Google"}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default GoogleDrive;
