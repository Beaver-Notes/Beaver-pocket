// App.js
import React from "react";
import { Routes, Route } from 'react-router-dom';
import Home from "./Home";
import Archive from "./Archive";
import Settings from "./Settings";
import About from "./settings/about"

const App: React.FC = () => (
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/archive" element={<Archive />} />
    <Route path="/settings" element={<Settings />}/>
    <Route path="/about" element={<About />}/>
  </Routes>
);

export default App;
