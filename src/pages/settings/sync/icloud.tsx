import React, { useEffect, useState } from "react";
import Icon from "@/components/ui/Icon";
import { useTranslation } from "@/utils/translations";
import iCloud from "@/utils/iCloud/iCloud";
import { forceSyncNow } from "@/composable/sync";
import { Preferences } from "@capacitor/preferences";

interface iCloudProps {
  syncStatus: string;
  disableClass?: boolean;
}

const SYNC_FOLDER_NAME = "BeaverNotesSync";

const iCloudSync: React.FC<iCloudProps> = ({ syncStatus, disableClass }) => {
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

  const [autoSync, setAutoSync] = useState<boolean>(false);

  useEffect(() => {
    const loadPreferences = async () => {
      const { value: storedSync } = await Preferences.get({ key: "sync" });
      return storedSync === "iCloud";
    };
    loadPreferences();
  }, []);

  useEffect(() => {
    const handleStorageChange = async () => {
      const { value: storedSync } = await Preferences.get({ key: "sync" });
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
    await Preferences.set({ key: "sync", value: syncValue });
    setAutoSync(!autoSync);
    const { exists } = await iCloud.checkFolderExists({
      folderName: `${SYNC_FOLDER_NAME}`,
    });
    if (!exists) {
      await iCloud.createFolder({ folderName: `${SYNC_FOLDER_NAME}` });
    }
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
        <section>
          <div className="flex flex-col space-y-2">
            <p className="text-4xl text-left font-bold p-4" aria-label="Webdav">
              iCloud
            </p>
            <div className="flex justify-center items-center">
              <div className="relative bg-opacity-40 rounded-full w-34 h-34 flex justify-center items-center">
                <Icon
                  name="iCloud"
                  className={`w-32 h-32 ${getIconClass(
                    ["syncing", "idle", "error"].includes(syncStatus)
                      ? (syncStatus as "syncing" | "idle" | "error")
                      : "idle"
                  )}`}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p
                className="text-lg"
                aria-label={translations.icloud.autoSync}
                id="auto-sync-label"
              >
                {translations.icloud.autoSync || "-"}
              </p>
              <label
                htmlFor="auto-sync-switch"
                className="relative inline-flex cursor-pointer items-center"
              >
                <input
                  id="auto-sync-switch"
                  type="checkbox"
                  checked={autoSync}
                  onChange={handleSyncToggle}
                  className="peer sr-only"
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
            <button
              className="w-full bg-neutral-200 dark:text-[color:var(--selected-dark-text)] dark:bg-[#2D2C2C] bg-opacity-40 text-black p-3 text-lg font-bold rounded-xl"
              onClick={forceSyncNow}
              aria-label={translations.icloud.sync}
            >
              {translations.icloud.sync || "-"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default iCloudSync;
