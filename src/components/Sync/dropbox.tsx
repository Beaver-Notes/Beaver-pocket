import React, { useEffect, useState } from "react";
import { Note } from "../../store/types";
import { Browser } from "@capacitor/browser";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";
import icons from "../../lib/remixicon-react";
const CLIENT_ID = import.meta.env.VITE_DROPBOX_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_DROPBOX_CLIENT_SECRET;

interface DropboxProps {
  notesState: Record<string, Note>;
  setNotesState: (notes: Record<string, Note>) => void;
  darkMode: any;
  themeMode: any;
}

const DropboxSync: React.FC<DropboxProps> = () => {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [authorizationCode, setAuthorizationCode] = useState<string>("");

  // Translations
  const [translations, setTranslations] = useState({
    dropbox: {
      title: "dropbox.title",
      import: "dropbox.import",
      export: "dropbox.export",
      submit: "dropbox.submit",
      getToken: "dropbox.getToken",
      autoSync: "dropbox.Autosync",
      logout: "dropbox.logout",
      refreshingToken: "dropbox.refreshingToken",
      placeholder: "dropbox.placeholder",
    },
    sync: {
      existingFolder: "sync.existingFolder",
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

  const handleLogin = async () => {
    await Browser.open({
      url: `https://www.dropbox.com/oauth2/authorize?response_type=code&client_id=${CLIENT_ID}&token_access_type=offline`,
    });
  };

  const handleExchange = async () => {
    if (authorizationCode) {
      const requestBody = new URLSearchParams({
        grant_type: "authorization_code",
        code: authorizationCode,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }).toString();

      try {
        const response = await fetch("https://api.dropbox.com/oauth2/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: requestBody,
        });

        if (response.ok) {
          const data = await response.json();
          const accessToken = data.access_token;
          const refreshToken = data.refresh_token;

          // Save tokens securely
          await SecureStoragePlugin.set({
            key: "dropbox_access_token",
            value: accessToken,
          });
          await SecureStoragePlugin.set({
            key: "dropbox_refresh_token",
            value: refreshToken,
          });

          setAccessToken(accessToken);
          setRefreshToken(refreshToken);
        } else {
          const errorData = await response.json();
          console.error(
            "Failed to exchange authorization code for tokens:",
            errorData
          );
        }
      } catch (error) {
        console.error("Error exchanging authorization code for tokens:", error);
      }
    } else {
      console.error("Authorization code is empty");
    }
  };

  const retrieveTokens = async () => {
    try {
      const storedAccessToken = (
        await SecureStoragePlugin.get({ key: "dropbox_access_token" })
      ).value;
      const storedRefreshToken = (
        await SecureStoragePlugin.get({ key: "dropbox_refresh_token" })
      ).value;

      if (storedAccessToken) {
        setAccessToken(storedAccessToken);
      }
      if (storedRefreshToken) {
        setRefreshToken(storedRefreshToken);
      }
    } catch (error) {
      console.error("Error retrieving tokens:", error);
    }
  };

  useEffect(() => {
    retrieveTokens();
  }, []);

  const refreshAccessToken = async () => {
    if (refreshToken) {
      const requestBody = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }).toString();

      try {
        const response = await fetch("https://api.dropbox.com/oauth2/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: requestBody,
        });

        if (response.ok) {
          const data = await response.json();
          const newAccessToken = data.access_token;

          // Save new access token
          await SecureStoragePlugin.set({
            key: "dropbox_access_token",
            value: newAccessToken,
          });
          setAccessToken(newAccessToken);
        } else {
          const errorData = await response.json();
          console.error("Failed to refresh access token:", errorData);
        }
      } catch (error) {
        console.error("Error refreshing access token:", error);
      }
    } else {
      console.error("Refresh token not found");
    }
  };

  const checkTokenExpiration = async () => {
    if (accessToken) {
      try {
        // Send a test request to Dropbox API to check if the token is valid
        const response = await fetch(
          "https://api.dropbox.com/2/users/get_current_account",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!response.ok) {
          await refreshAccessToken();
        }
      } catch (error) {
        console.error("Error checking token expiration:", error);
      }
    } else {
      console.error("Access token not found");
    }
  };

  useEffect(() => {
    const tokenExpirationCheck = async () => {
      await checkTokenExpiration();
    };

    tokenExpirationCheck();

    const tokenExpirationCheckInterval = setInterval(() => {
      checkTokenExpiration();
    }, 14400000);

    return () => clearInterval(tokenExpirationCheckInterval);
  }, [accessToken, refreshToken]);

  useEffect(() => {
    const retrieveAccessToken = async () => {
      try {
        const storedAccessToken = (
          await SecureStoragePlugin.get({ key: "dropbox_access_token" })
        ).value;
        if (storedAccessToken) {
          setAccessToken(storedAccessToken);
        }
      } catch (error) {
        console.error("Error retrieving access token:", error);
      }
    };

    retrieveAccessToken();
  }, []);

  const Logout = async () => {
    try {
      // Remove the access token from storage
      await SecureStoragePlugin.remove({ key: "dropbox_access_token" });
      await SecureStoragePlugin.remove({ key: "dropbox_refresh_token" });

      window.location.reload();
      console.log("Logged out successfully");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const [autoSync, setAutoSync] = useState<boolean>(() => {
    const storedSync = localStorage.getItem("sync");
    return storedSync === "dropbox";
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const storedSync = localStorage.getItem("sync");
      if (storedSync === "dropbox" && !autoSync) {
        setAutoSync(true);
      } else if (storedSync !== "dropbox" && autoSync) {
        setAutoSync(false);
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [autoSync]);

  const handleSyncToggle = () => {
    const syncValue = autoSync ? "none" : "dropbox";
    localStorage.setItem("sync", syncValue);
    setAutoSync(!autoSync);
  };

  return (
    <div className="sm:flex sm:justify-center sm:items-center sm:h-[80vh]">
      <div className="mx-4 sm:px-20 mb-2 items-center align-center text-center space-y-4">
        <p className="text-4xl text-left font-bold p-4" aria-label="dropbox">
          Dropbox
        </p>
        <div className="flex justify-center items-center">
          <div className="relative bg-opacity-40 rounded-full w-34 h-34 flex justify-center items-center">
            <icons.DropboxFillIcon className="w-32 h-32 text-blue-700 z-0" />
          </div>
        </div>
        {accessToken ? (
          <section>
            <div className="flex flex-col">
              <div className="space-y-2">
                <button
                  className="bg-neutral-200 dark:text-[color:var(--selected-dark-text)] dark:bg-[#2D2C2C] bg-opacity-40 w-full text-black p-3 text-lg font-bold rounded-xl"
                  onClick={Logout}
                  aria-label={
                    translations.dropbox.logout || "Logout from Dropbox"
                  }
                >
                  {translations.dropbox.logout || "-"}
                </button>
              </div>
            </div>
            <div className="flex items-center py-2 justify-between">
              <div>
                <p
                  className="block text-lg align-left"
                  aria-label={translations.dropbox.autoSync || "Auto Sync"}
                >
                  {translations.dropbox.autoSync || "-"}
                </p>
              </div>
              <label
                className="relative inline-flex cursor-pointer items-center"
                aria-label={translations.dropbox.autoSync || "Toggle auto sync"}
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
        ) : (
          <>
            <section>
              <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                <div className="space-y-4">
                  <input
                    type="text"
                    className="bg-neutral-200 dark:bg-[#2D2C2C] bg-opacity-40 w-full p-3 text-neutral-800 dark:text-neutral-200 outline-none p-2 text-lg rounded-xl"
                    placeholder={translations.dropbox.placeholder || "-"}
                    value={authorizationCode}
                    onChange={(e) => setAuthorizationCode(e.target.value)}
                    aria-label={translations.dropbox.placeholder}
                  />
                  <button
                    className="bg-neutral-200 dark:bg-[#2D2C2C] dark:text-[color:var(--selected-dark-text)] bg-opacity-40 w-full text-black p-3 text-xl font-bold rounded-xl"
                    onClick={handleExchange}
                    aria-label={
                      translations.dropbox.submit || "Submit authorization code"
                    }
                  >
                    {translations.dropbox.submit || "-"}
                  </button>
                  <button
                    className="bg-primary w-full text-white p-3 text-xl font-bold rounded-xl"
                    onClick={handleLogin}
                    aria-label={
                      translations.dropbox.getToken || "Get Dropbox token"
                    }
                  >
                    {translations.dropbox.getToken || "-"}
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

export default DropboxSync;
