// AppRoutes.tsx
import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Home from "./Home";
import Archive from "./Archive";
import Settings from "./Settings";
import About from "./components/Settings/about";
import Dropbox from "./components/Sync/dropbox";
import Onedrive from "./components/Sync/onedrive";
import Drive from "./components/Sync/drive";
import Dav from "./components/Sync/dav";
import Icloud from "./components/Sync/icloud";
import Shortcuts from "./components/Settings/shortcuts";
import Welcome from "./Welcome";
import Sync from "./components/Settings/sync";
import Editor from "./Editor";
import Icons from "./components/Settings/icons";
import { Note } from "./store/types";

interface routerProps {
  notesState: Record<string, Note>;
  setNotesState: (notes: Record<string, Note>) => void;
  themeMode: string;
  setThemeMode: (mode: string) => void;
  toggleTheme: (val: boolean | ((prev: boolean) => boolean)) => void;
  setAutoMode: () => void;
  darkMode: boolean;
}

const router: React.FC<routerProps> = ({
  notesState,
  setNotesState,
  themeMode,
  setThemeMode,
  toggleTheme,
  setAutoMode,
  darkMode,
}) => {
  const location = useLocation();

  return (
    <Routes location={location}>
      <Route
        path="/"
        element={<Home notesState={notesState} setNotesState={setNotesState} />}
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
        element={<Dav notesState={notesState} setNotesState={setNotesState} />}
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
        element={<Sync notesState={notesState} setNotesState={setNotesState} />}
      />
      <Route
        path="/editor/:note"
        element={
          <Editor notesState={notesState} setNotesState={setNotesState} />
        }
      />
    </Routes>
  );
};

export default router;
