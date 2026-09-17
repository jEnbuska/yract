import path from "node:path";
// `vitest/config` rather than `vite`: only its `defineConfig` knows the `test` block.
import { defineConfig } from "vitest/config";

/**
 * Vite config for the yract playground.
 *
 * - Tells Vite's JSX transform (oxc) to import the JSX helpers from
 *   `yract/jsx-runtime`.
 * - Aliases `yract` to the local `../src` so the playground runs
 *   directly against beta source — no separate build step.
 */
export default defineConfig({
  oxc: {
    jsx: {
      runtime: "automatic",
      importSource: "yract",
    },
  },
  resolve: {
    alias: {
      "yract/jsx-dev-runtime": path.resolve(import.meta.dirname, "../src/jsx-runtime.ts"),
      "yract/jsx-runtime": path.resolve(import.meta.dirname, "../src/jsx-runtime.ts"),
      yract: path.resolve(import.meta.dirname, "../src/index.ts"),
    },
  },
  test: {
    globals: true,
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
