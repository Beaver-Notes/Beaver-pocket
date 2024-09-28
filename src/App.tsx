import React, { useEffect, useState } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { CSSTransition, TransitionGroup } from "react-transition-group";
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
import { useImportDav } from "./utils/webDavUtil";
import "./assets/css/main.css";
import "./assets/css/fonts.css";
import "./assets/css/animations.css"; // Import your CSS animations file
import BottomNavBar from "./components/App/BottomNavBar";
import CommandPrompt from "./components/App/CommandPrompt";
import { loadNotes } from "./store/notes";
import { useNotesState } from "./store/Activenote";

const App: React.FC = () => {
  const history = useNavigate();
  const location = useLocation();
  const [checkedFirstTime, setCheckedFirstTime] = useState(false);
  const { notesState, setNotesState } = useNotesState();
  const [isSwipe, setIsSwipe] = useState(false);

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
        history("/welcome");
        localStorage.setItem("isFirstTime", "false");
      }
      setCheckedFirstTime(true);
    }
  }, [checkedFirstTime, history]);

  useEffect(() => {
    const syncValue = localStorage.getItem("sync");
    if (syncValue === "dropbox") {
      const dropboxImport = new CustomEvent("dropboxImport");
      document.dispatchEvent(dropboxImport);
    } else if (syncValue === "webdav") {
      const { HandleImportData } = useImportDav(setNotesState);
      HandleImportData();
    } else if (syncValue === "iCloud") {
      const iCloudImport = new CustomEvent("iCloudImport");
      document.dispatchEvent(iCloudImport);
    }
  });

  const [isCommandPromptOpen, setIsCommandPromptOpen] = useState(false);

  useEffect(() => {
    // Listen for key combination
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "p"
      ) {
        setIsCommandPromptOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  });

  // Determine whether to show the BottomNavBar
  const shouldShowNavBar = !["/welcome", "/editor"].some((path) =>
    location.pathname.startsWith(path)
  );

  const [themeMode] = useState(() => {
    const storedThemeMode = localStorage.getItem("themeMode");
    return storedThemeMode || "auto";
  });

  const [darkMode] = useState(() => {
    const prefersDarkMode = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    return themeMode === "auto" ? prefersDarkMode : themeMode === "dark";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("themeMode", themeMode);
  }, [darkMode, themeMode]);

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
        <TransitionGroup>
          <CSSTransition
            key={location.pathname}
            timeout={0}
            classNames={isSwipe ? "fade" : ""}
            onExited={() => setIsSwipe(false)}
            unmountOnExit
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
                  <Archive
                    notesState={notesState}
                    setNotesState={setNotesState}
                  />
                }
              />
              <Route
                path="/settings"
                element={
                  <Settings
                    notesState={notesState}
                    setNotesState={setNotesState}
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
                  />
                }
              />
              <Route path="/onedrive" element={<Onedrive setNotesState={setNotesState}/>} />
              <Route
                path="/webdav"
                element={
                  <Webdav
                    notesState={notesState}
                    setNotesState={setNotesState}
                  />
                }
              />
              <Route
                path="/icloud"
                element={
                  <Icloud
                    notesState={notesState}
                    setNotesState={setNotesState}
                  />
                }
              />
              <Route path="/gdrive" element={<Gdrive setNotesState={setNotesState}/>} />
              <Route path="/onedrive" element={<Welcome />} />
              <Route path="/shortcuts" element={<Shortcuts />} />
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
                  <Editor
                    notesState={notesState}
                    setNotesState={setNotesState}
                  />
                }
              />
            </Routes>
          </CSSTransition>
        </TransitionGroup>
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