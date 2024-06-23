import React, { useEffect, useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import Home from "./Home";
import Archive from "./Archive";
import Settings from "./Settings";
import About from "./settings/about";
import { App as CapacitorApp } from "@capacitor/app";
import Shortcuts from "./settings/shortcuts";
import Welcome from "./Welcome";
import Dropbox from "./settings/screens/dropbox";
import Webdav from "./settings/screens/webdav";
import { Auth0Provider } from "@auth0/auth0-react";
import Auth0Config from "./utils/auth0-config";
import Sync from "./settings/sync";
import { useExportDav, useImportDav } from "./utils/webDavUtil"

const App: React.FC = () => {
  const history = useNavigate();
  const [checkedFirstTime, setCheckedFirstTime] = useState(false);

  CapacitorApp.addListener("backButton", ({ canGoBack }) => {
    if (!canGoBack) {
      CapacitorApp.exitApp();
    } else {
      window.history.back();
    }
  });

   useEffect(() => {
    const selectedDarkText =
      localStorage.getItem('selected-dark-text') || 'white';
    document.documentElement.style.setProperty(
      '--selected-dark-text',
      selectedDarkText
    );
  }, []);

  useEffect(() => {
    // Check if it's the first time only when the app starts
    if (!checkedFirstTime) {
      const isFirstTime = localStorage.getItem("isFirstTime");

      if (isFirstTime === null || isFirstTime === "true") {
        // It's the first time or the flag is not set, redirect to welcome page
        history("/welcome");

        // Set the flag to false after the initial check
        localStorage.setItem("isFirstTime", "false");
      }

      // Set the flag to false after the initial check
      setCheckedFirstTime(true);
    }
  }, [checkedFirstTime, history]);

  const { exportdata } = useExportDav();
  const { HandleImportData } = useImportDav();

  useEffect(() => {
    // Check if sync is set to 'dropbox'
    const syncValue = localStorage.getItem("sync");
    if (syncValue === "dropbox") {
      // Start the interval only if sync is set to 'dropbox'
      const intervalId = setInterval(() => {
        const exportAndDownloadEvent = new CustomEvent("exportAndDownloadEvent");
        document.dispatchEvent(exportAndDownloadEvent);
        alert('exporting data to dropbox');
      }, 30 * 60 * 1000); // 1 minute

      // Clear interval on unmount
      return () => clearInterval(intervalId);
    } else if (syncValue === "webdav") {
      const intervalId = setInterval(() => {
        exportdata();
        HandleImportData();
        alert("exporting data");
      }, 30 * 60 * 1000); // 1 minute

      // Clear interval on unmount
      return () => clearInterval(intervalId);
    }
  }, [exportdata, HandleImportData]);

  return (
    <>
      <Auth0Provider
        domain={Auth0Config.domain}
        clientId={Auth0Config.clientId}
        authorizationParams={{
          redirect_uri: window.location.origin,
        }}
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/archive" element={<Archive />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/about" element={<About />} />
          <Route path="/dropbox" element={<Dropbox />} />
          <Route path="/webdav" element={<Webdav />} />
          <Route path="/shortcuts" element={<Shortcuts />} />
          <Route path="/welcome" element={<Welcome />} />
          <Route path="/Sync" element={<Sync />} />
        </Routes>
      </Auth0Provider>
    </>
  );
};

export default App;
