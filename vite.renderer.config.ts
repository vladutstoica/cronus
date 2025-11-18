import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  root: resolve(__dirname, "src/renderer"),
  resolve: {
    alias: {
      "@renderer": resolve(__dirname, "src/renderer/src"),
      src: resolve(__dirname, "src/renderer/src"),
    },
    extensions: [".mjs", ".js", ".ts", ".jsx", ".tsx", ".json"],
  },
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, "src/renderer/index.html"),
        floating: resolve(__dirname, "src/renderer/floating.html"),
      },
    },
  },
});
