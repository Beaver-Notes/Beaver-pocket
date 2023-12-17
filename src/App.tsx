// App.js
import React from "react";
import { Routes, Route } from 'react-router-dom';
import Home from "./Home";
import Archive from "./Archive";

const App: React.FC = () => (
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/archive" element={<Archive />} />
  </Routes>
);

export default App;
