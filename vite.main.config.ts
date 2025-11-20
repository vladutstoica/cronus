import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@shared": resolve(__dirname, "src/shared"),
    },
  },
  build: {
    rollupOptions: {
      external: [
        // Only externalize native modules that can't be bundled
        "better-sqlite3",
        "native-window-observer",
      ],
    },
  },
});
