import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./assets/css/main.css";
import { BrowserRouter } from "react-router-dom";
import { SendIntent } from "send-intent";
import { ImportBEA } from "./utils/share/BEA";
import { Encoding, Filesystem } from "@capacitor/filesystem";
import { Preferences } from "@capacitor/preferences";

function normalizeFilePath(encodedUrl: any) {
  try {
    let decodedUrl = decodeURIComponent(encodedUrl);
    if (decodedUrl.startsWith("file%3A%2F%2F")) {
      decodedUrl = decodedUrl.replace("file%3A%2F%2F", "file://");
    }
    return decodedUrl;
  } catch (err) {
    console.error("Error normalizing file path:", err);
    return "";
  }
}

async function handleSendIntent(result: any) {
  if (!result) return;
  if (!result.url) return;

  const normalizedUrl = normalizeFilePath(result.url);

  try {
    const content = await Filesystem.readFile({
      path: normalizedUrl,
      encoding: Encoding.UTF8,
    });

    if (typeof content.data === "string") {
      ImportBEA(content.data);
    } else if (content.data instanceof Blob) {
      const reader = new FileReader();
      reader.onload = (event) => ImportBEA(event.target?.result as string);
      reader.readAsText(content.data);
    }
  } catch (err) {
    console.error("Error reading file:", err);
  }
}

SendIntent.checkSendIntentReceived()
  .then(handleSendIntent)
  .catch((err) => console.error("SendIntent check failed:", err));

(async () => {
  try {
    const { value } = await Preferences.get({
      key: "pendingSpotSearchId",
    });
    if (value) {
      await Preferences.remove({ key: "pendingSpotSearchId" });
      window.location.href = `/note/${value}`;
    }
  } catch (err) {
    console.error("Error checking pending SpotSearch ID:", err);
  }
})();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter
      future={{
        v7_relativeSplatPath: true,
        v7_startTransition: true,
      }}
    >
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
