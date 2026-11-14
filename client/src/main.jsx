import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AppProvider } from "./context.jsx";
import App from "./App.jsx";
import "./styles/tokens.css";
import "./styles/app.css";
import "./styles/extra.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppProvider>
        <App />
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>
);
requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add("is-ready")));
