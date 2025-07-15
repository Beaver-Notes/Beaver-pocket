import React, { useEffect, useState, useCallback, useMemo } from "react";
import { SafeArea } from "@capacitor-community/safe-area";
import { useNavigate, useLocation } from "react-router-dom";
import Router from "./router";
import { Auth0Provider } from "@auth0/auth0-react";
import Auth0Config from "./utils/auth0-config";
import "./assets/css/main.css";
import "./assets/css/fonts.css";
import BottomNavBar from "./components/App/BottomNavBar";
import CommandPrompt from "./components/App/CommandPrompt";
import { setStoreRemotePath } from "./store/useDataPath";
import { loadNotes } from "./store/notes";
import { useNotesState } from "./store/Activenote";
import Mousetrap from "mousetrap";
import { Keyboard, KeyboardResize } from "@capacitor/keyboard";
import { Capacitor } from "@capacitor/core";
import { Filesystem, FilesystemDirectory } from "@capacitor/filesystem";
import { SplashScreen } from "@capacitor/splash-screen";

// Types for sync services
type SyncService = "dropbox" | "iCloud" | "onedrive" | "webdav" | "googledrive";

// Lazy load sync services
const syncServices = {
  dropbox: () => import("./utils/Dropbox/DropboxSync"),
  iCloud: () => import("./utils/iCloud/iCloudSync"),
  onedrive: () => import("./utils/Onedrive/oneDriveSync"),
  webdav: () => import("./utils/Webdav/webDavSync"),
  googledrive: () => import("./utils/Google Drive/GoogleDriveSync"),
};

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
  const [themeMode, setThemeMode] = useState<string>(initialTheme.mode);
  const [darkMode, setDarkMode] = useState<boolean>(initialTheme.isDark);
  const [isCommandPromptOpen, setIsCommandPromptOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [notesLoaded, setNotesLoaded] = useState(false);

  const { notesState, setNotesState } = useNotesState();

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

        if (isIPad()) {
          Keyboard.setResizeMode({ mode: KeyboardResize.None });
        } else if (platform !== "android") {
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
        setIsInitialized(true); // Still allow app to continue
      }
    };

    criticalInit();
  }, [platform]);

  useEffect(() => {
    if (!isInitialized || notesLoaded) return;

    const loadNotesAsync = async () => {
      try {
        const notes = (await loadNotes()).notes;
        setNotesState(notes);
        setNotesLoaded(true);
      } catch (error) {
        console.error("Error loading notes:", error);
        setNotesLoaded(true); // Still mark as loaded to prevent retry
      }
    };

    const timeoutId = setTimeout(loadNotesAsync, 50);
    return () => clearTimeout(timeoutId);
  }, [isInitialized, notesLoaded, setNotesState]);

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

  const handleSync = useCallback(async () => {
    const syncValue = localStorage.getItem("sync") as SyncService;
    if (!syncValue || !syncServices[syncValue]) return;

    try {
      const syncModule = await syncServices[syncValue]();

      switch (syncValue) {
        case "dropbox":
          const { useDropboxSync } = syncModule as any;
          const { syncDropbox } = useDropboxSync(setNotesState);
          syncDropbox();
          break;
        case "iCloud":
          const { useiCloudSync } = syncModule as any;
          const { synciCloud } = useiCloudSync(setNotesState);
          synciCloud();
          break;
        case "onedrive":
          const { useOneDriveSync } = syncModule as any;
          const { syncOneDrive } = useOneDriveSync(setNotesState);
          syncOneDrive();
          break;
        case "webdav":
          const { useWebDAVSync } = syncModule as any;
          const { syncWebDAV } = useWebDAVSync(setNotesState);
          syncWebDAV();
          break;
        case "googledrive":
          const { useDriveSync } = syncModule as any;
          const { syncDrive } = useDriveSync(setNotesState);
          syncDrive();
          break;
      }
    } catch (error) {
      console.error(`Error syncing with ${syncValue}:`, error);
    }
  }, [setNotesState]);

  useEffect(() => {
    if (!isInitialized) return;

    const loadNotesFromStorage = async () => {
      try {
        const notes = (await loadNotes()).notes;
        setNotesState(notes);
      } catch (error) {
        console.error("Error reloading notes:", error);
      }
    };

    document.addEventListener("reload", loadNotesFromStorage);
    document.addEventListener("sync", handleSync);

    return () => {
      document.removeEventListener("reload", loadNotesFromStorage);
      document.removeEventListener("sync", handleSync);
    };
  }, [isInitialized, handleSync, setNotesState]);

  useEffect(() => {
    const loadNotesFromStorage = async () => {
      const notes = await (await loadNotes()).notes;
      console.log(notes);
      setNotesState(notes);
    };

    document.addEventListener("reload", loadNotesFromStorage);

    return () => {
      document.removeEventListener("reload", loadNotesFromStorage);
    };
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

    const shortcuts: Array<[string, () => void]> = [
      ["mod+shift+p", () => setIsCommandPromptOpen(true)],
      ["mod+backspace", () => setIsCommandPromptOpen(false)],
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
      <Auth0Provider
        domain={Auth0Config.domain}
        clientId={Auth0Config.clientId}
        authorizationParams={{
          redirect_uri: window.location.origin,
        }}
      >
        <Router
          notesState={notesState}
          setNotesState={setNotesState}
          themeMode={themeMode}
          setThemeMode={setThemeMode}
          toggleTheme={toggleTheme}
          setAutoMode={setAutoMode}
          darkMode={darkMode}
        />
      </Auth0Provider>

      <CommandPrompt
        setIsCommandPromptOpen={setIsCommandPromptOpen}
        isOpen={isCommandPromptOpen}
        setNotesState={setNotesState}
        notesState={notesState}
      />

      {shouldShowNavBar && (
        <BottomNavBar notesState={notesState} setNotesState={setNotesState} />
      )}
    </div>
  );
};

export default App;
