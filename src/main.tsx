// Import necessary dependencies
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
<<<<<<< Updated upstream
import "normalize.css";
=======
import "./css/main.css";
import { BrowserRouter } from "react-router-dom";  // Import BrowserRouter
import { SplashScreen } from '@capacitor/splash-screen';

SplashScreen.hide();
>>>>>>> Stashed changes

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
