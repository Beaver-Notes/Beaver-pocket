import React, { useEffect, useMemo, useState } from "react";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";
import { WebDavService } from "@/utils/Webdav/webDavApi";
import WebDAV from "@/utils/Webdav/WebDAVPlugin";
import Icon from "@/components/ui/Icon";
import { useTranslation } from "@/utils/translations";
import { forceSyncNow } from "@/composable/sync";
import { Preferences } from "@capacitor/preferences";

interface WebdavProps {
  syncStatus: string;
  disableClass?: boolean;
}

const SYNC_FOLDER_NAME = "BeaverNotesSync";

const Webdav: React.FC<WebdavProps> = ({ syncStatus, disableClass }) => {
  const [logged, setLogged] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [baseUrl, setBaseUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [securityWarning, setSecurityWarning] = useState<string | null>(null);
  const [autoSync, setAutoSync] = useState(false);
  const [insecureMode, setInsecureMode] = useState(false);

  const [translations, setTranslations] = useState<Record<string, any>>({
    accessibility: {},
    webdav: {},
  });
  const [showInputContent, setShowInputContent] = useState(false);

  // ---------- Initialize preferences & creds ----------
  useEffect(() => {
    const loadPreferences = async () => {
      const { value: storedSync } = await Preferences.get({ key: "sync" });
      setAutoSync(storedSync === "webdav");

      const { value: storedInsecure } = await Preferences.get({
        key: "insecureWebDAV",
      });
      setInsecureMode(storedInsecure === "true");
    };
    loadPreferences();
  }, []);

  const initialize = async () => {
    try {
      const { value: bu } = await SecureStoragePlugin.get({ key: "baseUrl" });
      const { value: un } = await SecureStoragePlugin.get({ key: "username" });
      const { value: pw } = await SecureStoragePlugin.get({ key: "password" });

      setBaseUrl(bu ?? "");
      setUsername(un ?? "");
      setPassword(pw ?? "");
      setLogged(Boolean(bu && un && pw));
    } catch {
      setLogged(false);
    }
  };

  useEffect(() => {
    initialize();
  }, []);

  // ---------- Create WebDAV service with current creds ----------
  const webDavService = useMemo(() => {
    return new WebDavService({ baseUrl, username, password });
  }, [baseUrl, username, password]);

  // ---------- Security warning ----------
  useEffect(() => {
    if (baseUrl.startsWith("http://") && !insecureMode) {
      setSecurityWarning(
        "Insecure WebDAV connection detected. Please enable 'Insecure Mode' to allow HTTP connections."
      );
    } else if (baseUrl.startsWith("http://") && insecureMode) {
      setSecurityWarning(
        "Warning: You are using an insecure HTTP connection. Data transmitted over HTTP is not encrypted and may be intercepted."
      );
    } else {
      setSecurityWarning(null);
    }
  }, [baseUrl, insecureMode]);

  // ---------- Debounced autosave ----------
  useEffect(() => {
    const id = setTimeout(() => {
      if (baseUrl) {
        SecureStoragePlugin.set({ key: "baseUrl", value: baseUrl });
      }
      if (username) {
        SecureStoragePlugin.set({ key: "username", value: username });
      }
      if (password) {
        SecureStoragePlugin.set({ key: "password", value: password });
      }
    }, 300);

    return () => clearTimeout(id);
  }, [baseUrl, username, password]);

  // ---------- Translations ----------
  useEffect(() => {
    const fetchTranslations = async () => {
      const trans = await useTranslation();
      if (trans) setTranslations(trans);
    };
    fetchTranslations();
  }, []);

  // ---------- Login ----------
  const login = async () => {
    if (!baseUrl || !username || !password) {
      throw new Error("Missing login credentials");
    }
    try {
      await SecureStoragePlugin.set({ key: "baseUrl", value: baseUrl });
      await SecureStoragePlugin.set({ key: "username", value: username });
      await SecureStoragePlugin.set({ key: "password", value: password });

      setLogged(true);

      const exists = await webDavService.folderExists(SYNC_FOLDER_NAME);
      if (!exists) await webDavService.createFolder(SYNC_FOLDER_NAME);
    } catch (err) {
      console.error("Error logging in:", err);
    }
  };

  // ---------- Preferences sync ----------
  useEffect(() => {
    const handleStorageChange = async () => {
      const { value: storedSync } = await Preferences.get({ key: "sync" });
      setAutoSync(storedSync === "webdav");
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const handleSyncToggle = async () => {
    const syncValue = autoSync ? "none" : "webdav";
    await Preferences.set({ key: "sync", value: syncValue });
    setAutoSync(!autoSync);
  };

  const handleInsecureToggle = async () => {
    const newMode = !insecureMode;
    await Preferences.set({ key: "insecureWebDAV", value: String(newMode) });
    setInsecureMode(newMode);
    await WebDAV.setInsecureMode({ insecure: newMode });
  };

  // ---------- Helpers ----------
  const toggleInputContentVisibility = () => {
    setShowInputContent(!showInputContent);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Cert = (reader.result as string).split(",")[1];
      try {
        await WebDAV.uploadCertificate({
          certificate: base64Cert,
          alias: file.name,
        });
      } catch (err: any) {
        throw new Error(`Error uploading certificate: ${err.message}`);
      }
    };
    reader.readAsDataURL(file);
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

  // ---------- UI ----------
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
        <section>
          <div className="flex flex-col space-y-2">
            <p className="text-4xl text-left font-bold p-4" aria-label="Webdav">
              Webdav
            </p>

            {/* Status Icon */}
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

            {/* Warnings */}
            {securityWarning && (
              <div className="text-red-600 dark:text-red-400 text-sm font-medium px-4">
                {securityWarning}
              </div>
            )}

            {/* Inputs */}
            <input
              type="text"
              className="w-full p-3 dark:bg-neutral-800 border dark:border-neutral-600 border-2 rounded-xl"
              value={baseUrl}
              placeholder="https://server.example"
              onChange={(e) => setBaseUrl(e.target.value)}
              aria-label={translations.accessibility.webdavUrl}
            />

            <input
              type="text"
              className="w-full p-3 dark:bg-neutral-800 border dark:border-neutral-600 border-2 rounded-xl"
              value={username}
              placeholder={translations.webdav.username}
              onChange={(e) => setUsername(e.target.value)}
              aria-label={translations.webdav.username}
            />

            <div className="relative">
              <input
                type={showInputContent ? "text" : "password"}
                className="w-full p-3 dark:bg-neutral-800 border dark:border-neutral-600 border-2 rounded-xl pr-10"
                value={password}
                placeholder={translations.webdav.password}
                onChange={(e) => setPassword(e.target.value)}
                aria-label={translations.webdav.password}
              />
              <button
                onClick={toggleInputContentVisibility}
                className="absolute right-0 py-2.5 text-sm text-neutral-500"
              >
                {showInputContent ? (
                  <Icon name="EyeLine" className="w-8 h-8 mr-2" />
                ) : (
                  <Icon name="EyeCloseLine" className="w-8 h-8 mr-2" />
                )}
              </button>
            </div>

            {/* Login button */}
            <button
              className="bg-neutral-200 dark:bg-[#2D2C2C] w-full p-3 text-lg font-bold rounded-xl"
              onClick={login}
            >
              {translations.webdav.login || "-"}
            </button>

            {/* Logged-in features */}
            {logged && (
              <div className="flex flex-col space-y-4 py-2">
                <button
                  className="bg-neutral-200 dark:bg-[#2D2C2C] w-full p-3 text-lg font-bold rounded-xl"
                  onClick={forceSyncNow}
                >
                  {translations.webdav.sync || "-"}
                </button>

                {/* Auto Sync */}
                <div className="flex items-center justify-between">
                  <p className="text-lg">
                    {translations.webdav.autoSync || "-"}
                  </p>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={autoSync}
                      onChange={handleSyncToggle}
                      className="peer sr-only"
                    />
                    <div
                      className="peer h-8 w-[3.75rem] rounded-full border dark:border-[#353333] dark:bg-[#353333]
                      after:absolute after:left-[2px] after:top-0.5 after:h-7 after:w-7 after:rounded-full 
                      after:border after:border-neutral-300 after:bg-white after:transition-all
                      peer-checked:bg-primary peer-checked:after:translate-x-full"
                    />
                  </label>
                </div>

                {/* Advanced */}
                <div className="w-full">
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
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

                {showAdvanced && (
                  <div className="flex flex-col space-y-4">
                    {/* Insecure Mode */}
                    <div className="flex items-center justify-between">
                      <p className="text-lg">
                        {translations.webdav.insecureMode || "-"}
                      </p>
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input
                          type="checkbox"
                          checked={insecureMode}
                          onChange={handleInsecureToggle}
                          className="peer sr-only"
                        />
                        <div
                          className="peer h-8 w-[3.75rem] rounded-full border dark:border-[#353333] dark:bg-[#353333]
                          after:absolute after:left-[2px] after:top-0.5 after:h-7 after:w-7 after:rounded-full 
                          after:border after:border-neutral-300 after:bg-white after:transition-all
                          peer-checked:bg-primary peer-checked:after:translate-x-full"
                        />
                      </label>
                    </div>

                    {/* File Upload */}
                    <label className="bg-neutral-200 dark:bg-[#2D2C2C] w-full p-3 text-lg font-bold rounded-xl">
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
        </section>
      </div>
    </div>
  );
};

export default Webdav;
