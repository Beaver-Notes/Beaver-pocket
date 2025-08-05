import React, { useEffect, useState, useCallback, useMemo } from "react";
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
import { Filesystem, FilesystemDirectory } from "@capacitor/filesystem";
import { SplashScreen } from "@capacitor/splash-screen";
import Dialog from "./components/ui/Dialog";

// Import styles
import "./assets/css/main.css";
import "./assets/css/fonts.css";
import useDropboxSync from "./utils/Dropbox/DropboxSync";
import useiCloudSync from "./utils/iCloud/iCloudSync";
import useOneDriveSync from "./utils/Onedrive/oneDriveSync";
import useWebDAVSync from "./utils/Webdav/webDavSync";
import useDriveSync from "./utils/Google Drive/GoogleDriveSync";
import { useNoteStore } from "./store/note";

// Memoized theme detection
const getInitialTheme = () => {
  const stored = localStorage.getItem("themeMode") || "auto";
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return {
    mode: stored,
    isDark: stored === "auto" ? prefersDark : stored === "dark",
  };
};

// Memoized iPad detection
const isIPad = (): boolean => {
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
  const isModernIPad =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return /iPad/.test(ua) || isModernIPad;
};

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const platform = Capacitor.getPlatform();
  const initialTheme = useMemo(() => getInitialTheme(), []);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "error">(
    "idle"
  );
  const noteStore = useNoteStore.getState();
  const [themeMode, setThemeMode] = useState<string>(initialTheme.mode);
  const [darkMode, setDarkMode] = useState<boolean>(initialTheme.isDark);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [notesLoaded, setNotesLoaded] = useState(false);
  const store = useStore();
  const { syncDropbox } = useDropboxSync();
  const { synciCloud } = useiCloudSync();
  const { syncOneDrive } = useOneDriveSync();
  const { syncWebDAV } = useWebDAVSync();
  const { syncDrive } = useDriveSync();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("themeMode", themeMode);
  }, [darkMode, themeMode]);

  useEffect(() => {
    if (themeMode !== "auto") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      setDarkMode(e.matches);
    };

    setDarkMode(mediaQuery.matches);

    mediaQuery.addEventListener("change", handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
    };
  }, [themeMode]);

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

        if (isIPad() && Capacitor.getPlatform() !== "web") {
          Keyboard.setResizeMode({ mode: KeyboardResize.None });
        } else if (
          platform !== "android" &&
          Capacitor.getPlatform() !== "web"
        ) {
          Keyboard.setResizeMode({ mode: KeyboardResize.Native });
        }

        const selectedDarkText =
          localStorage.getItem("selected-dark-text") || "white";
        document.documentElement.style.setProperty(
          "--selected-dark-text",
          selectedDarkText
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
      const isFirstTime = localStorage.getItem("isFirstTime");
      if (isFirstTime === null || isFirstTime === "true") {
        navigate("/welcome");
        localStorage.setItem("isFirstTime", "false");
      }
    };

    const timeoutId = setTimeout(checkFirstTime, 100);
    return () => clearTimeout(timeoutId);
  }, [navigate]);

  const handleSync = async () => {
    setSyncStatus("syncing");
    try {
      const syncValue = localStorage.getItem("sync");
      if (syncValue === "dropbox") {
        await syncDropbox();
      } else if (syncValue === "iCloud") {
        await synciCloud();
      } else if (syncValue === "onedrive") {
        await syncOneDrive();
      } else if (syncValue === "webdav") {
        await syncWebDAV();
      } else if (syncValue === "googledrive") {
        await syncDrive();
      }
      setSyncStatus("idle"); // done
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
      shortcuts.forEach(([shortcut]) => {
        Mousetrap.unbind(shortcut);
      });
    };
  }, [isInitialized, navigate]);

  const toggleTheme = useCallback(
    (newMode: boolean | ((prevState: boolean) => boolean)) => {
      const isDark =
        typeof newMode === "function" ? newMode(darkMode) : newMode;
      setDarkMode(isDark);
      setThemeMode(isDark ? "dark" : "light");
    },
    [darkMode]
  );

  const setAutoMode = useCallback(() => {
    const prefersDarkMode = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    setThemeMode("auto");
    setDarkMode(prefersDarkMode);
  }, []);

  const shouldShowNavBar = useMemo(() => {
    return !["/welcome", "/editor"].some((path) =>
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
      <Router
        themeMode={themeMode}
        setThemeMode={setThemeMode}
        toggleTheme={toggleTheme}
        setAutoMode={setAutoMode}
        darkMode={darkMode}
        syncStatus={syncStatus}
      />

      {shouldShowNavBar && <BottomNavBar />}
      <Dialog />
    </div>
  );
};

export default App;
