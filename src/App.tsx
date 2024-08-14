import React, { useEffect, useState } from "react";
import { Routes, Route, useNavigate, useParams, useLocation } from "react-router-dom";
import { useSwipeable } from "react-swipeable";
import { CSSTransition, TransitionGroup } from "react-transition-group";
import Home from "./Home";
import Archive from "./Archive";
import Settings from "./Settings";
import About from "./settings/about";
import { App as CapacitorApp } from "@capacitor/app";
import Shortcuts from "./settings/shortcuts";
import Welcome from "./Welcome";
import Dropbox from "./settings/screens/dropbox";
import Webdav from "./settings/screens/webdav";
import Editor from "./Editor";
import { Auth0Provider } from "@auth0/auth0-react";
import Auth0Config from "./utils/auth0-config";
import Sync from "./settings/sync";
import { useImportDav } from "./utils/webDavUtil";
import "./assets/css/main.css";
import "./assets/css/fonts.css";
import "./assets/css/animations.css"; // Import your CSS animations file
import { useNotesState } from "./store/Activenote";
import BottomNavBar from "./components/Home/BottomNavBar";

const App: React.FC = () => {
  const history = useNavigate();
  const [checkedFirstTime, setCheckedFirstTime] = useState(false);
  const location = useLocation();

  // Add back button listener for Android
  CapacitorApp.addListener("backButton", ({ canGoBack }) => {
    if (!canGoBack) {
      CapacitorApp.exitApp();
    } else {
      window.history.back();
    }
  });

  useEffect(() => {
    const selectedDarkText = localStorage.getItem("selected-dark-text") || "white";
    document.documentElement.style.setProperty("--selected-dark-text", selectedDarkText);
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
      const { HandleImportData } = useImportDav();
      HandleImportData();
    }
  });

  function EditorWrapper() {
    const { note } = useParams<{ note: string }>();
    const { notesState } = useNotesState();

    if (!note) {
      return <div>No note ID provided</div>;
    }

    const noteData = notesState[note];

    if (!noteData) {
      return <div>Note not found</div>;
    }
    localStorage.setItem("lastNoteEdit", note);
    return <Editor note={noteData} />;
  }

  // Swipeable handler to go back when swiping right
  const swipeHandlers = useSwipeable({
    onSwipedRight: () => history(-1),
    preventScrollOnSwipe: true,
    trackTouch: true,
  });

  return (
    <div {...swipeHandlers}>
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
            timeout={300}
            classNames="fade"
            unmountOnExit
          >
            <Routes location={location}>
              <Route path="/" element={<Home />} />
              <Route path="/archive" element={<Archive />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/about" element={<About />} />
              <Route path="/dropbox" element={<Dropbox />} />
              <Route path="/webdav" element={<Webdav />} />
              <Route path="/shortcuts" element={<Shortcuts />} />
              <Route path="/welcome" element={<Welcome />} />
              <Route path="/Sync" element={<Sync />} />
              <Route path="/editor/:note" element={<EditorWrapper />} />
            </Routes>
          </CSSTransition>
        </TransitionGroup>
      </Auth0Provider>
      <BottomNavBar />
    </div>
  );
};

export default App;
