// App.js
import React from "react";
import { Routes, Route } from 'react-router-dom';
import Home from "./Home";
import Archive from "./Archive";
import Settings from "./Settings";
import About from "./settings/about"
import Shortcuts from "./settings/shortcuts"

const App: React.FC = () => (
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/archive" element={<Archive />} />
    <Route path="/settings" element={<Settings />}/>
    <Route path="/about" element={<About />}/>
    <Route path="/shortcuts" element={<Shortcuts />}/>
  </Routes>
);

export default App;
