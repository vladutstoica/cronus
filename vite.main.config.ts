import { defineConfig } from "vite";

export default defineConfig({
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
