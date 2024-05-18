import React, { useEffect, useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import Home from "./Home";
import Archive from "./Archive";
import Settings from "./Settings";
import About from "./settings/about";
import { App as CapacitorApp } from "@capacitor/app";
import Shortcuts from "./settings/shortcuts";
import Welcome from "./Welcome";
import Dropbox from "./settings/screens/Dropbox";
import Webdav from "./settings/screens/Webdav";
import { Auth0Provider } from "@auth0/auth0-react";
import Auth0Config from "./settings/screens/deps/auth0-config";
import Sync from "./settings/sync";

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

  useEffect(() => {
    // Check if sync is set to 'dropbox'
    const syncValue = localStorage.getItem("sync");
    if (syncValue === "dropbox") {
      // Start the interval only if sync is set to 'dropbox'
      const intervalId = setInterval(() => {
        const exportAndDownloadEvent = new CustomEvent(
          "exportAndDownloadEvent"
        );
        document.dispatchEvent(exportAndDownloadEvent);
      }, 30 * 60 * 1000); // 30 minutes

      // Clear interval on unmount
      return () => clearInterval(intervalId);
    }
    if (syncValue === "webdav") {
      const intervalId = setInterval(() => {
        const eiWendavEvent = new CustomEvent("eiWendavEvent");
        document.dispatchEvent(eiWendavEvent);
        console.log("eiWendavEvent dispatched");
      }, 10 * 1000);
      return () => clearInterval(intervalId);
    }
  }, []);

  // Extract authorization code from URL params and pass it to Onedrive component
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get("code");
    if (code) {
      // Redirect to the Onedrive component with the authorization code
      history(`/onedrive?code=${code}`);
    }
  }, [location.search, history]);

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
