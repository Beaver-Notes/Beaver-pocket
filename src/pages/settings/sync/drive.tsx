import React, { useEffect, useState } from "react";
import icons from "@/lib/remixicon-react";
import { driveService } from "@/utils/Google Drive/GoogleOauth";

const GoogleDrive: React.FC = () => {
  const [user, setUser] = useState<any | null>(null);
  const [autoSync, setAutoSync] = useState(
    () => localStorage.getItem("sync") === "googledrive"
  );
  const [translations, setTranslations] = useState({
    gdrive: {
      title: "gdrive.title",
      import: "gdrive.import",
      export: "gdrive.export",
      autoSync: "gdrive.Autosync",
      logout: "gdrive.logout",
      login: "gdrive.login",
      refreshingToken: "gdrive.refreshingToken",
    },
    sync: {
      existingFolder: "sync.existingFolder",
    },
  });

  // Load translations
  useEffect(() => {
    const loadTranslations = async () => {
      const lang = localStorage.getItem("selectedLanguage") || "en";
      try {
        const module = await import(`../../assets/locales/${lang}.json`);
        setTranslations((prev) => ({ ...prev, ...module.default }));
      } catch (error) {
        console.error("Failed to load translations:", error);
      }
    };
    loadTranslations();
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
        console.log("Signed in with access token.");
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

  return (
    <div className="sm:flex sm:justify-center sm:items-center sm:h-[80vh]">
      <div className="mx-4 sm:px-20 mb-2 items-center align-center text-center space-y-4">
        <div className="flex justify-center items-center">
          <div className="flex flex-col items-center">
            <p className="text-4xl font-bold p-4">Drive</p>
            <icons.GDrive className="w-32 h-32 text-neutral-800 dark:text-neutral-200" />
          </div>
        </div>

        {user ? (
          <section>
            <button
              className="bg-neutral-200 dark:bg-[#2D2C2C] w-full text-black p-3 text-lg font-bold rounded-xl"
              onClick={Logout}
            >
              {translations.gdrive.logout || "Logout"}
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
