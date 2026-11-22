import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AppProvider } from "./context/AppProvider.jsx";
import App from "./App.jsx";

// Opt in to React Router v7 behaviour now (silences the upgrade warnings).
const ROUTER_FUTURE = { v7_startTransition: true, v7_relativeSplatPath: true };
import "./styles/tokens.css";
import "./styles/app.css";
import "./styles/extra.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter future={ROUTER_FUTURE}>
      <AppProvider>
        <App />
      </AppProvider>
    </BrowserRouter>
  </React.StrictMode>
);
requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add("is-ready")));
