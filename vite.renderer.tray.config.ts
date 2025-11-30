import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  root: resolve(__dirname, "src/renderer"),
  plugins: [react()],
  server: {
    port: 5175,
    strictPort: true,
  },
  build: {
    outDir: resolve(__dirname, ".vite/renderer/tray_window"),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, "src/renderer/tray.html"),
    },
  },
  resolve: {
    alias: {
      "@renderer": resolve(__dirname, "src/renderer/src"),
      src: resolve(__dirname, "src/renderer/src"),
    },
  },
});
