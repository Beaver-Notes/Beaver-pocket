import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Router from "./router";
import BottomNavBar from "./components/app/BottomNavBar";
import { CommandPrompt } from "./components/app/CommandPrompt";
import { setStoreRemotePath } from "./store/useDataPath";
import Mousetrap from "mousetrap";
import { Capacitor } from "@capacitor/core";
import { useStore } from "@/store/index";
import { migrateData } from "@/store/storage";
import {
  Encoding,
  Filesystem,
  FilesystemDirectory,
} from "@capacitor/filesystem";
import { SplashScreen } from "@capacitor/splash-screen";
import Dialog from "./components/ui/Dialog";
import "./assets/css/main.css";
import "./assets/css/fonts.css";
import useDropboxSync from "./utils/Dropbox/DropboxSync";
import useiCloudSync from "./utils/iCloud/iCloudSync";
import useOneDriveSync from "./utils/Onedrive/oneDriveSync";
import useWebDAVSync from "./utils/Webdav/webDavSync";
import useDriveSync from "./utils/Google Drive/GoogleDriveSync";
import { Preferences } from "@capacitor/preferences";
import { useTheme } from "./composable/theme";
import { SendIntent } from "send-intent";
import { ImportBEA } from "./utils/share/BEA";
import { EdgeToEdge } from "@capawesome/capacitor-android-edge-to-edge-support";
import { StatusBar, Style } from "@capacitor/status-bar";

function normalizeFilePath(encodedUrl: any) {
  try {
    let decodedUrl = decodeURIComponent(encodedUrl);
    if (decodedUrl.startsWith("file%3A%2F%2F")) {
      decodedUrl = decodedUrl.replace("file%3A%2F%2F", "file://");
    }
    return decodedUrl;
  } catch {
    return "";
  }
}

const App: React.FC = () => {
  const store = useStore();
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const platform = Capacitor.getPlatform();
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "error">(
    "idle"
  );
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const { syncDropbox } = useDropboxSync();
  const { synciCloud } = useiCloudSync();
  const { syncOneDrive } = useOneDriveSync();
  const { syncWebDAV } = useWebDAVSync();
  const { syncDrive } = useDriveSync();

  // Load notes in the background
  useEffect(() => {
    const loadNotesEarly = async () => {
      try {
        await store.retrieve();
      } catch (error) {
        console.error("Error loading notes early:", error);
      }
    };
    loadNotesEarly();
  }, [store]);

  // Handle send intent and spot search
  useEffect(() => {
    const onSendIntent = () => {
      SendIntent.checkSendIntentReceived().then(async (result) => {
        if (!result?.url) return;
        const normalizedUrl = normalizeFilePath(result.url);
        try {
          const content = await Filesystem.readFile({
            path: normalizedUrl,
            encoding: Encoding.UTF8,
          });
          if (typeof content.data === "string") {
            const noteId = await ImportBEA(content.data);
            navigate(`/note/${noteId}`);
          }
        } catch (err) {
          console.error("Error reading file:", err);
        }
      });
    };
    const onSpotOpen = (ev: any) => {
      const id: string | undefined = ev?.id;
      if (!id) return;
      const [, noteId] = id.includes(":") ? id.split(":") : [undefined, id];
      navigate(`/note/${noteId}`);
    };
    window.addEventListener("sendIntentReceived", onSendIntent);
    window.addEventListener("spotsearchOpen", onSpotOpen);
    return () => {
      window.removeEventListener("sendIntentReceived", onSendIntent);
      window.removeEventListener("spotsearchOpen", onSpotOpen);
    };
  }, [navigate]);

  // Initialize theme
  useEffect(() => {
    const initTheme = async () => {
      await theme.loadTheme();
      const savedColor = await Preferences.get({ key: "color-scheme" });
      const root = document.documentElement;
      root.classList.forEach((cls) => {
        if (cls !== "light" && cls !== "dark") root.classList.remove(cls);
      });
      root.classList.add(savedColor.value || "light");
      await Preferences.set({
        key: "color-scheme",
        value: savedColor.value || "light",
      });
    };
    initTheme();
  }, []);

  // Parallelize critical initialization tasks
  useEffect(() => {
    const criticalInit = async () => {
      try {
        await Promise.all([
          (async () => {
            if (Capacitor.getPlatform() === "android") {
              await EdgeToEdge.setBackgroundColor({
                color: theme.currentTheme === "light" ? "#ffffff" : "#262626",
              });
              await StatusBar.setStyle({
                style:
                  theme.currentTheme === "light" ? Style.Light : Style.Dark,
              });
            }
          })(),
          (async () => {
            const { uri } = await Filesystem.getUri({
              directory: FilesystemDirectory.Data,
              path: "",
            });
            setStoreRemotePath(Capacitor.convertFileSrc(uri));
            await migrateData();
          })(),
        ]);

        const { value: selectedDarkText } = await Preferences.get({
          key: "selected-dark-text",
        });
        document.documentElement.style.setProperty(
          "--selected-dark-text",
          selectedDarkText ?? "white"
        );

        setIsInitialized(true);
      } catch (error) {
        console.error("Error during critical initialization:", error);
        setIsInitialized(true);
      }
    };

    const runCriticalInit = async () => {
      await criticalInit();
      SplashScreen.hide();
    };

    runCriticalInit();
  }, [platform]);

  // Check if it's the first time the app is opened
  useEffect(() => {
    const checkFirstTime = async () => {
      const { value } = await Preferences.get({ key: "isFirstTime" });
      if (value === null || value === "true") {
        navigate("/welcome");
        await Preferences.set({ key: "isFirstTime", value: "false" });
      }
    };
    const timeoutId = setTimeout(checkFirstTime, 100);
    return () => clearTimeout(timeoutId);
  }, [navigate]);

  // Handle sync
  const handleSync = async () => {
    setSyncStatus("syncing");
    try {
      const { value: syncValue } = await Preferences.get({ key: "sync" });
      if (syncValue === "dropbox") await syncDropbox();
      else if (syncValue === "iCloud") await synciCloud();
      else if (syncValue === "onedrive") await syncOneDrive();
      else if (syncValue === "webdav") await syncWebDAV();
      else if (syncValue === "googledrive") await syncDrive();
      setSyncStatus("idle");
    } catch (error) {
      console.error("Sync error:", error);
      setSyncStatus("error");
    }
  };

  useEffect(() => {
    if (!isInitialized) return;
    const loadNotesFromStorage = async () => {
      await store.retrieve();
    };
    document.addEventListener("reload", loadNotesFromStorage);
    document.addEventListener("sync", handleSync);
    return () => {
      document.removeEventListener("reload", loadNotesFromStorage);
      document.removeEventListener("sync", handleSync);
    };
  }, [isInitialized, handleSync]);

  useEffect(() => {
    if (!isInitialized) return;
    const shortcuts: Array<[string, () => void]> = [
      ["mod+shift+p", () => setShowPrompt(true)],
      ["mod+shift+n", () => navigate("/")],
      ["mod+shift+a", () => navigate("/archive")],
      ["mod+,", () => navigate("/settings")],
    ];
    shortcuts.forEach(([shortcut, handler]) => {
      Mousetrap.bind(shortcut, (e: KeyboardEvent) => {
        e.preventDefault();
        handler();
      });
    });
    return () => {
      shortcuts.forEach(([shortcut]) => Mousetrap.unbind(shortcut));
    };
  }, [isInitialized, navigate]);

  const shouldShowNavBar = useMemo(() => {
    return !["/welcome", "/note"].some((path) =>
      location.pathname.startsWith(path)
    );
  }, [location.pathname]);

  // Render nothing until the WebView is ready
  if (!isInitialized) {
    return null;
  }

  return (
    <div>
      <div className="safe-area"></div>
      <CommandPrompt showPrompt={showPrompt} setShowPrompt={setShowPrompt} />
      <Router syncStatus={syncStatus} />
      {shouldShowNavBar && (
        <div className="fixed left-0 right-0 z-40 bottom-[var(--inset-bottom-effective)]">
          <BottomNavBar />
        </div>
      )}
      <Dialog />
      <div className="safe-area-bottom" />
    </div>
  );
};

export default App;
