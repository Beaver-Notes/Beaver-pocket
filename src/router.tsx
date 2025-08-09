// AppRoutes.tsx
import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Index from "./Index";
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

interface routerProps {
  themeMode: string;
  setThemeMode: (mode: string) => void;
  toggleTheme: (val: boolean | ((prev: boolean) => boolean)) => void;
  setAutoMode: () => void;
  darkMode: boolean;
  syncStatus: string;
}

const router: React.FC<routerProps> = ({
  themeMode,
  setThemeMode,
  toggleTheme,
  setAutoMode,
  darkMode,
  syncStatus,
}) => {
  const location = useLocation();

  return (
    <Routes location={location}>
      <Route path="/" element={<Index />} />
      <Route path="/archive" element={<Index showArchived={true} />} />
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
      <Route path="/dropbox" element={<Dropbox syncStatus={syncStatus} />} />
      <Route path="/onedrive" element={<Onedrive syncStatus={syncStatus} />} />
      <Route path="/dav" element={<Dav syncStatus={syncStatus} />} />
      <Route path="/icloud" element={<Icloud syncStatus={syncStatus} />} />
      <Route path="/drive" element={<Drive syncStatus={syncStatus} />} />
      <Route path="/shortcuts" element={<Shortcuts />} />
      <Route path="/icons" element={<Icons />} />
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/sync" element={<Sync />} />
      <Route path="/editor/:note" element={<Editor />} />
    </Routes>
  );
};

export default router;
