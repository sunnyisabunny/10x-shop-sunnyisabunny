/**
 * NOTE: the entry point. This is the first code the browser runs.
 * Why it exists: something has to attach React to the empty #root element in `index.html`.
 * Connects to: `App.tsx` (what gets drawn) and `index.css` (Tailwind and the design tokens).
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

const rootElement = document.getElementById("root");

// getElementById can return null, and strict TypeScript forces us to handle that.
// Without this check the app would crash with a far less clear error.
if (!rootElement) {
  throw new Error("Could not find the #root element in index.html.");
}

// StrictMode runs extra checks in development only, such as running effects twice to expose missing
// cleanups. It does nothing in the production build.
createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
