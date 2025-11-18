import { defineConfig, externalizeDepsPlugin } from "electron-vite";

export default defineConfig({
  plugins: [externalizeDepsPlugin()],
});
