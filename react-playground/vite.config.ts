import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * The React counterpart of the yract playground.
 *
 * The React Compiler is on for the whole app: it inserts the memoisation a
 * hand-tuned React app would write by hand, which is the fairest thing to put
 * beside a framework that never re-runs a component it does not have to.
 */
export default defineConfig({
  plugins: [react({ compiler: true })],
  server: { port: 5175 },
});
