import React, { useEffect, useState } from "react";
import { Routes, Route, useNavigate } from 'react-router-dom';
import Home from "./Home";
import Archive from "./Archive";
import Settings from "./Settings";
import About from "./settings/about";
import Shortcuts from "./settings/shortcuts";
import Welcome from "./Welcome";
import { Plugins } from '@capacitor/core';
import { FilesystemDirectory } from "@capacitor/filesystem";

const { Filesystem } = Plugins;

const App: React.FC = () => {
  const history = useNavigate();
  const [checkedFirstTime, setCheckedFirstTime] = useState(false);

  useEffect(() => {
    // Check if it's the first time only when the app starts
    if (!checkedFirstTime) {
      Filesystem.readFile({
        path: 'data.json',
        directory: FilesystemDirectory.Data,
      })
        .then(() => {
          // File exists, not the first time
        })
        .catch(() => {
          // File doesn't exist, it's the first time
          // You can redirect to the welcome page or perform other actions here
          history("/welcome");
        })
        .finally(() => {
          // Set the flag to true after the initial check
          setCheckedFirstTime(true);
        });
    }
  }, [checkedFirstTime, history]);

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/archive" element={<Archive />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/about" element={<About />} />
      <Route path="/shortcuts" element={<Shortcuts />} />
      <Route path="/welcome" element={<Welcome />} />
    </Routes>
  );
};

export default App;
