import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import { resolve } from "path";

export default defineConfig({
  plugins: [externalizeDepsPlugin()],
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, "src/preload/index.ts"),
        floatingPreload: resolve(__dirname, "src/preload/floatingPreload.ts"),
      },
    },
  },
});
