/**
 * NOTE: tells Vite how to build the app.
 * Why it exists: Vite is the dev server and the bundler. It needs to know we use React and Tailwind.
 * Connects to: `tsconfig.json`, which holds the `@/` alias that `tsconfigPaths` reads here, so the
 * alias is written in one place only.
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { tsconfigPaths: true },
});
