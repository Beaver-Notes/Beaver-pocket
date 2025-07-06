import React, { useEffect, useState } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import Home from "./Home";
import Archive from "./Archive";
import Settings from "./Settings";
import About from "./components/Settings/about";
import { App as CapacitorApp } from "@capacitor/app";
import Shortcuts from "./components/Settings/shortcuts";
import Welcome from "./Welcome";
import Dropbox from "./components/Sync/dropbox";
import Onedrive from "./components/Sync/onedrive";
import Drive from "./components/Sync/drive";
import Dav from "./components/Sync/dav";
import Icloud from "./components/Sync/icloud";
import { Auth0Provider } from "@auth0/auth0-react";
import Auth0Config from "./utils/auth0-config";
import Sync from "./components/Settings/sync";
import Editor from "./Editor";
import "./assets/css/main.css";
import "./assets/css/fonts.css";
import BottomNavBar from "./components/App/BottomNavBar";
import CommandPrompt from "./components/App/CommandPrompt";
import { setStoreRemotePath } from "./store/useDataPath";
import { loadNotes } from "./store/notes";
import { useNotesState } from "./store/Activenote";
import Mousetrap from "mousetrap";
import { Keyboard, KeyboardResize } from "@capacitor/keyboard";
import { isPlatform } from "@ionic/react";
import Icons from "./components/Settings/icons";
import { Capacitor } from "@capacitor/core";
import { Filesystem, FilesystemDirectory } from "@capacitor/filesystem";
import { StatusBar, Style } from "@capacitor/status-bar";
import useDropboxSync from "./utils/Dropbox/DropboxSync";
import useiCloudSync from "./utils/iCloud/iCloudSync";
import useOneDriveSync from "./utils/Onedrive/oneDriveSync";
import useWebDAVSync from "./utils/Webdav/webDavSync";
import useDriveSync from "./utils/Google Drive/GoogleDriveSync";

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [checkedFirstTime, setCheckedFirstTime] = useState(false);
  const { notesState, setNotesState } = useNotesState();
  const { syncDropbox } = useDropboxSync(setNotesState);
  const { synciCloud } = useiCloudSync(setNotesState);
  const { syncOneDrive } = useOneDriveSync(setNotesState);
  const { syncWebDAV } = useWebDAVSync(setNotesState);
  const { syncDrive } = useDriveSync(setNotesState);
  const [themeMode, setThemeMode] = useState<string>(
    localStorage.getItem("themeMode") || "auto"
  );
  const colorScheme = localStorage.getItem("color-scheme") || "light";
  document.documentElement.classList.add(colorScheme);
  const [darkMode, setDarkMode] = useState(() => {
    const prefersDarkMode = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    return themeMode === "auto" ? prefersDarkMode : themeMode === "dark";
  });
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("themeMode", themeMode);
  }, [darkMode, themeMode]);

  // Function to toggle dark mode
  const toggleTheme = (
    newMode: boolean | ((prevState: boolean) => boolean)
  ) => {
    setDarkMode(newMode);
    setThemeMode(newMode ? "dark" : "light");
  };

  const setAutoMode = () => {
    const prefersDarkMode = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    setDarkMode(prefersDarkMode);
    setThemeMode("auto");
  };

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
    const handleSync = () => {
      const syncValue = localStorage.getItem("sync");
      if (syncValue === "dropbox") {
        syncDropbox();
      } else if (syncValue === "iCloud") {
        synciCloud();
      } else if (syncValue === "onedrive") {
        syncOneDrive();
      } else if (syncValue === "webdav") {
        syncWebDAV();
      } else if (syncValue === "googledrive") {
        console.log("Syncing with Google Drive");
        syncDrive();
      }
    };

    document.addEventListener("sync", handleSync);

    return () => {
      document.removeEventListener("sync", handleSync);
    };
  }, []);

  useEffect(() => {
    const initialize = async () => {
      try {
        // Fetch the URI
        const { uri } = await Filesystem.getUri({
          directory: FilesystemDirectory.Data,
          path: "",
        });
        setStoreRemotePath(Capacitor.convertFileSrc(uri));

        // Load notes from storage
        const notes = (await loadNotes()).notes;
        setNotesState(notes);
      } catch (error) {
        console.error("Error initializing data:", error);
      }
    };

    initialize();
  }, []);

  useEffect(() => {
    const selectedDarkText =
      localStorage.getItem("selected-dark-text") || "white";
    document.documentElement.style.setProperty(
      "--selected-dark-text",
      selectedDarkText
    );
  }, []);

  useEffect(() => {
    if (!checkedFirstTime) {
      const isFirstTime = localStorage.getItem("isFirstTime");
      if (isFirstTime === null || isFirstTime === "true") {
        navigate("/welcome");
        localStorage.setItem("isFirstTime", "false");
      }
      setCheckedFirstTime(true);
    }
  }, [checkedFirstTime, history]);

  async function styleStatusBar(darkMode: boolean) {
    StatusBar.setStyle({ style: darkMode ? Style.Dark : Style.Light });

    if (Capacitor.getPlatform() === "android") {
      await StatusBar.setBackgroundColor({
        color: darkMode ? "#232222" : "#FFFFFF",
      });
    }
  }

  styleStatusBar(darkMode).catch(console.error);

  const [isCommandPromptOpen, setIsCommandPromptOpen] = useState(false);

  useEffect(() => {
    // Add back button listener for Android
    CapacitorApp.addListener("backButton", ({ canGoBack }) => {
      if (!canGoBack) {
        CapacitorApp.exitApp(); // Exit app if no history to go back
      } else {
        navigate(-1); // Navigate back in the browser history
      }
    });

    return () => {
      CapacitorApp.removeAllListeners(); // Clean up listeners
    };
  }, [navigate]);

  useEffect(() => {
    Mousetrap.bind("mod+shift+p", (e) => {
      e.preventDefault();
      setIsCommandPromptOpen(true);
    });

    Mousetrap.bind("mod+backspace", (e) => {
      e.preventDefault();
      handleEscape();
    });

    Mousetrap.bind("mod+shift+n", (e) => {
      e.preventDefault();
      navigate("/");
    });

    Mousetrap.bind("mod+shift+a", (e) => {
      e.preventDefault();
      navigate("/archive");
    });

    Mousetrap.bind("mod+,", (e) => {
      e.preventDefault();
      navigate("/archive");
    });

    return () => {
      Mousetrap.unbind("mod+shift+p");
      Mousetrap.unbind("mod+backspace");
      Mousetrap.unbind("mod+n");
      Mousetrap.unbind("mod+shift+n");
      Mousetrap.unbind("mod+shift+w");
      Mousetrap.unbind("mod+shift+a");
      Mousetrap.unbind("mod+,");
    };
  }, []);

  const handleEscape = () => {
    setIsCommandPromptOpen(false);
  };

  const shouldShowNavBar = !["/welcome", "/editor"].some((path) =>
    location.pathname.startsWith(path)
  );

  if (isPlatform("ipad")) {
    Keyboard.setResizeMode({ mode: KeyboardResize.None });
  } else if (!isPlatform("android")) {
    Keyboard.setResizeMode({ mode: KeyboardResize.Native });
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
        <Routes location={location}>
          <Route
            path="/"
            element={
              <Home notesState={notesState} setNotesState={setNotesState} />
            }
          />
          <Route
            path="/archive"
            element={
              <Archive notesState={notesState} setNotesState={setNotesState} />
            }
          />
          <Route
            path="/settings"
            element={
              <Settings
                themeMode={themeMode}
                setThemeMode={setThemeMode}
                toggleTheme={toggleTheme}
                setAutoMode={setAutoMode}
                darkMode={darkMode}
              />
            }
          />
          <Route path="/about" element={<About />} />
          <Route
            path="/dropbox"
            element={
              <Dropbox
                notesState={notesState}
                setNotesState={setNotesState}
                themeMode={themeMode}
                darkMode={darkMode}
              />
            }
          />
          <Route
            path="/onedrive"
            element={<Onedrive setNotesState={setNotesState} />}
          />
          <Route
            path="/dav"
            element={
              <Dav notesState={notesState} setNotesState={setNotesState} />
            }
          />
          <Route
            path="/icloud"
            element={
              <Icloud notesState={notesState} setNotesState={setNotesState} />
            }
          />
          <Route path="/drive" element={<Drive />} />
          <Route path="/shortcuts" element={<Shortcuts />} />
          <Route path="/icons" element={<Icons />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route
            path="/sync"
            element={
              <Sync notesState={notesState} setNotesState={setNotesState} />
            }
          />
          <Route
            path="/editor/:note"
            element={
              <Editor notesState={notesState} setNotesState={setNotesState} />
            }
          />
        </Routes>
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
