import React, { useEffect, useState } from "react";
import { Routes, Route, useNavigate } from 'react-router-dom';
import Home from "./Home";
import Archive from "./Archive";
import Settings from "./Settings";
import About from "./settings/about";
import Shortcuts from "./settings/shortcuts";
import Welcome from "./Welcome";

const App: React.FC = () => {
  const history = useNavigate();
  const [checkedFirstTime, setCheckedFirstTime] = useState(false);

  useEffect(() => {
    // Check if it's the first time only when the app starts
    if (!checkedFirstTime) {
      const isFirstTime = localStorage.getItem('isFirstTime');

      if (isFirstTime === null || isFirstTime === "true") {
        // It's the first time or the flag is not set, redirect to welcome page
        history("/welcome");
        
        // Set the flag to false after the initial check
        localStorage.setItem('isFirstTime', 'false');
      }

      // Set the flag to false after the initial check
      setCheckedFirstTime(true);
    }
  }, [checkedFirstTime, history]);

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/archive" element={<Archive />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/about" element={<About />} />
        <Route path="/shortcuts" element={<Shortcuts />} />
        <Route path="/welcome" element={<Welcome />} />
      </Routes>
    </>
  );
};

export default App;
