import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  root: resolve(__dirname, "src/renderer"),
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
  },
  build: {
    outDir: resolve(__dirname, ".vite/renderer/floating_window"),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, "src/renderer/floating.html"),
    },
  },
  resolve: {
    alias: {
      "@renderer": resolve(__dirname, "src/renderer/src"),
      src: resolve(__dirname, "src/renderer/src"),
    },
  },
});
