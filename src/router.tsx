// AppRoutes.tsx
import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Home from "./Home";
import Archive from "./Archive";
import Settings from "./Settings";
import About from "./pages/settings/about";
import Dropbox from "./pages/settings/sync/dropbox";
import Onedrive from "./pages/settings/sync/onedrive";
import Drive from "./pages/settings/sync/drive";
import Dav from "./pages/settings/sync/dav";
import Icloud from "./pages/settings/sync/icloud";
import Shortcuts from "./pages/settings/shortcuts";
import Welcome from "./Welcome";
import Sync from "./pages/settings/sync";
import Editor from "./pages/notes/_id";
import Icons from "./pages/settings/icons";
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
