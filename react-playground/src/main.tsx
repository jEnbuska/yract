/**
 * Entry point — mounts the React playground into `#root`.
 *
 * No `<StrictMode>`: it double-invokes render in dev, which would double the
 * table's "Re-renders" column and make it incomparable with the yract one.
 */
import { createRoot } from "react-dom/client";
import { App } from "./App";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Missing #root element");
const root = createRoot(rootEl);
root.render(<App />);
if (window.location.hash) document.getElementById(window.location.hash)?.scrollIntoView();
