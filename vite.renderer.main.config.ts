import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  root: resolve(__dirname, "src/main-window"),
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, ".vite/renderer/main_window"),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@renderer": resolve(__dirname, "src/renderer/src"),
      src: resolve(__dirname, "src/renderer/src"),
    },
  },
});
