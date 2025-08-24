import React, { useEffect, useState, useMemo } from "react";
import { SafeArea } from "@capacitor-community/safe-area";
import { useNavigate, useLocation } from "react-router-dom";
import Router from "./router";
import BottomNavBar from "./components/app/BottomNavBar";
import { CommandPrompt } from "./components/app/CommandPrompt";
import { setStoreRemotePath } from "./store/useDataPath";
import Mousetrap from "mousetrap";
import { Keyboard, KeyboardResize } from "@capacitor/keyboard";
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
import { useNoteStore } from "./store/note";
import { Preferences } from "@capacitor/preferences";
import { useTheme } from "./composable/theme";
import { SendIntent } from "send-intent";
import { ImportBEA } from "./utils/share/BEA";

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

const isIPad = (): boolean => {
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
  const isModernIPad =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return /iPad/.test(ua) || isModernIPad;
};

const App: React.FC = () => {
  const store = useStore();
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const platform = Capacitor.getPlatform();
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "error">(
    "idle"
  );
  const noteStore = useNoteStore.getState();
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [notesLoaded, setNotesLoaded] = useState(false);
  const { syncDropbox } = useDropboxSync();
  const { synciCloud } = useiCloudSync();
  const { syncOneDrive } = useOneDriveSync();
  const { syncWebDAV } = useWebDAVSync();
  const { syncDrive } = useDriveSync();

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
            ImportBEA(content.data);
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

  useEffect(() => {
    const initTheme = async () => {
      await theme.loadTheme();
    };
    initTheme();
    const setColor = async (color: string) => {
      const root = document.documentElement;
      root.classList.forEach((cls) => {
        if (cls !== "light" && cls !== "dark") root.classList.remove(cls);
      });
      root.classList.add(color);
      await Preferences.set({ key: "color-scheme", value: color });
    };

    (async () => {
      const savedColor = await Preferences.get({ key: "color-scheme" });
      setColor(savedColor.value || "light");
    })();
  }, []);

  useEffect(() => {
    const criticalInit = async () => {
      try {
        SafeArea.enable({
          config: {
            customColorsForSystemBars: true,
            statusBarColor: "#00000000",
            statusBarContent: "light",
            navigationBarColor: "#00000000",
            navigationBarContent: "light",
          },
        });

        const { uri } = await Filesystem.getUri({
          directory: FilesystemDirectory.Data,
          path: "",
        });
        setStoreRemotePath(Capacitor.convertFileSrc(uri));

        if (isIPad() && platform !== "web") {
          Keyboard.setResizeMode({ mode: KeyboardResize.None });
        } else if (platform !== "android" && platform !== "web") {
          Keyboard.setResizeMode({ mode: KeyboardResize.Native });
        }

        await migrateData();

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
    criticalInit();
  }, [platform]);

  useEffect(() => {
    if (!isInitialized || notesLoaded) return;
    const loadNotesAsync = async () => {
      try {
        await store.retrieve();
        setNotesLoaded(true);
      } catch (error) {
        console.error("Error loading notes:", error);
        setNotesLoaded(true);
      }
    };
    const timeoutId = setTimeout(loadNotesAsync, 50);
    return () => clearTimeout(timeoutId);
  }, [isInitialized, notesLoaded]);

  useEffect(() => {
    if (isInitialized && notesLoaded) {
      const hideSplash = async () => {
        try {
          await SplashScreen.hide();
        } catch (error) {
          console.error("Error hiding splash screen:", error);
        }
      };
      const timeoutId = setTimeout(hideSplash, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [isInitialized, notesLoaded]);

  useEffect(() => {
    const checkFirstTime = () => {
      (async () => {
        const { value } = await Preferences.get({ key: "isFirstTime" });
        if (value === null || value === "true") {
          navigate("/welcome");
          await Preferences.set({ key: "isFirstTime", value: "false" });
        }
      })();
    };
    const timeoutId = setTimeout(checkFirstTime, 100);
    return () => clearTimeout(timeoutId);
  }, [navigate]);

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
      await noteStore.retrieve();
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

  if (!isInitialized) {
    return (
      <div className="safe-area">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="safe-area"></div>
      <CommandPrompt showPrompt={showPrompt} setShowPrompt={setShowPrompt} />
      <Router syncStatus={syncStatus} />
      {shouldShowNavBar && <BottomNavBar />}
      <Dialog />
    </div>
  );
};

export default App;
