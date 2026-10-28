import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { startAnalytics } from "./analytics.ts";
import { App } from "./App.tsx";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

startAnalytics(import.meta.env.VITE_CF_ANALYTICS_TOKEN);
