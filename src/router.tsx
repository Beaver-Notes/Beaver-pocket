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
import Note from "./pages/note/_id";
import Folder from "./pages/folder/_id";
import Icons from "./pages/settings/icons";

interface routerProps {
  syncStatus: string;
}

const router: React.FC<routerProps> = ({ syncStatus }) => {
  const location = useLocation();

  return (
    <Routes location={location}>
      <Route path="/" element={<Index />} />
      <Route path="/archive" element={<Index showArchived={true} />} />
      <Route path="/settings" element={<Settings />} />
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
      <Route path="/note/:note" element={<Note />} />
      <Route path="/folder/:folderId" element={<Folder />} />
    </Routes>
  );
};

export default router;
