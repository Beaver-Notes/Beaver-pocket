import React, { useEffect, useState } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import Home from "./Home";
import Archive from "./Archive";
import Settings from "./Settings";
import About from "./settings/about";
import { App as CapacitorApp } from "@capacitor/app";
import Shortcuts from "./settings/shortcuts";
import Welcome from "./Welcome";
import Dropbox from "./settings/screens/dropbox";
import Onedrive from "./settings/screens/onedrive";
import Gdrive from "./settings/screens/gdrive";
import Webdav from "./settings/screens/webdav";
import Icloud from "./settings/screens/icloud";
import { Auth0Provider } from "@auth0/auth0-react";
import Auth0Config from "./utils/auth0-config";
import Sync from "./settings/sync";
import Editor from "./Editor";
import { useImportDav } from "./utils/Webdav/webDavUtil";
import "./assets/css/main.css";
import "./assets/css/fonts.css";
import BottomNavBar from "./components/App/BottomNavBar";
import CommandPrompt from "./components/App/CommandPrompt";
import { loadNotes } from "./store/notes";
import { useNotesState } from "./store/Activenote";
import Mousetrap from "mousetrap";
import { Keyboard, KeyboardResize } from "@capacitor/keyboard";
import { isPlatform } from "@ionic/react";
import Icons from "./settings/icons";

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [checkedFirstTime, setCheckedFirstTime] = useState(false);
  const { notesState, setNotesState } = useNotesState();
  const [themeMode, setThemeMode] = useState(() => {
    const storedThemeMode = localStorage.getItem("themeMode");
    return storedThemeMode || "auto";
  });

  const isIpad = isPlatform("ipad");

  document.addEventListener("reload", () => {
    const loadNotesFromStorage = async () => {
      const notes = await loadNotes();
      setNotesState(notes);
    };

    loadNotesFromStorage();
  });

  document.addEventListener("notelink", (event: Event) => {
    const customEvent = event as CustomEvent;
    const noteId = customEvent.detail.noteId;
    navigate(`/editor/${noteId}`);
  });

  useEffect(() => {
    const loadNotesFromStorage = async () => {
      const notes = await loadNotes();
      setNotesState(notes);
    };

    loadNotesFromStorage();
  }, []);

  // Add back button listener for Android
  CapacitorApp.addListener("backButton", ({ canGoBack }) => {
    if (!canGoBack) {
      CapacitorApp.exitApp();
    } else {
      window.history.back();
    }
  });

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

  const { HandleImportData } = useImportDav(setNotesState);

  useEffect(() => {
    const handleSync = () => {
      const syncValue = localStorage.getItem("sync");

      if (syncValue === "dropbox") {
        const dropboxImport = new CustomEvent("dropboxImport");
        document.dispatchEvent(dropboxImport);
      } else if (syncValue === "webdav") {
        HandleImportData(); // now safely called
      } else if (syncValue === "iCloud") {
        const iCloudImport = new CustomEvent("iCloudImport");
        document.dispatchEvent(iCloudImport);
      } else if (syncValue === "googledrive") {
        const driveImport = new CustomEvent("driveImport");
        document.dispatchEvent(driveImport);
      } else if (syncValue === "onedrive") {
        const onedriveImport = new CustomEvent("onedriveImport");
        document.dispatchEvent(onedriveImport);
      }
    };

    handleSync();
  }, [HandleImportData]);

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

  if (isIpad) {
    Keyboard.setResizeMode({ mode: KeyboardResize.None });
  } else {
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
              <Settings themeMode={themeMode} setThemeMode={setThemeMode}/>
            }
          />
          <Route path="/about" element={<About />} />
          <Route
            path="/dropbox"
            element={
              <Dropbox notesState={notesState} setNotesState={setNotesState} />
            }
          />
          <Route
            path="/onedrive"
            element={<Onedrive setNotesState={setNotesState} />}
          />
          <Route
            path="/webdav"
            element={
              <Webdav notesState={notesState} setNotesState={setNotesState} />
            }
          />
          <Route
            path="/icloud"
            element={
              <Icloud notesState={notesState} setNotesState={setNotesState} />
            }
          />
          <Route
            path="/gdrive"
            element={<Gdrive setNotesState={setNotesState} />}
          />
          <Route path="/onedrive" element={<Welcome />} />
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
