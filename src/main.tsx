import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./css/main.css";
import { SplashScreen } from '@capacitor/splash-screen';

SplashScreen.hide();

ReactDOM.createRoot (document. getElementById ("root") as HTMLElement) . render (
<React. StrictMode>
<App />
</React.StrictMode>
) ;