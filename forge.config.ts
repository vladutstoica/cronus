import type { ForgeConfig } from "@electron-forge/shared-types";
import { VitePlugin } from "@electron-forge/plugin-vite";
import { AutoUnpackNativesPlugin } from "@electron-forge/plugin-auto-unpack-natives";
import { MakerDMG } from "@electron-forge/maker-dmg";
import { MakerZIP } from "@electron-forge/maker-zip";
import path from "path";
import fs from "fs";

const config: ForgeConfig = {
  packagerConfig: {
    name: "Cronus",
    executableName: "Cronus",
    appBundleId: "com.cronus.app",
    icon: "./resources/icon",
    asar: {
      unpack: "{**/*.node,**/node_modules/better-sqlite3/**/*,**/node_modules/native-window-observer/**/*}",
    },
  },
  rebuildConfig: {},
  makers: [
    new MakerDMG({
      name: "Cronus",
      format: "ULFO",
    }),
    new MakerZIP({}, ["darwin"]),
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: "src/main/index.ts",
          config: "vite.main.config.ts",
        },
        {
          entry: "src/preload/preload.ts",
          config: "vite.preload.config.ts",
        },
        {
          entry: "src/preload/floatingPreload.ts",
          config: "vite.preload.config.ts",
        },
      ],
      renderer: [
        {
          name: "main_window",
          config: "vite.renderer.main.config.ts",
        },
        {
          name: "floating_window",
          config: "vite.renderer.floating.config.ts",
        },
      ],
    }),
    new AutoUnpackNativesPlugin({}),
  ],
  hooks: {
    packageAfterPrune: async (_config, buildPath) => {
      const { execSync } = require("child_process");

      // Create node_modules directory if it doesn't exist
      const nodeModulesPath = path.join(buildPath, "node_modules");
      if (!fs.existsSync(nodeModulesPath)) {
        fs.mkdirSync(nodeModulesPath, { recursive: true });
      }

      // Copy native-window-observer to the build
      const nwoSourcePath = path.join(__dirname, "native-modules", "native-window-observer");
      const nwoTargetPath = path.join(buildPath, "node_modules", "native-window-observer");

      await fs.promises.cp(nwoSourcePath, nwoTargetPath, { recursive: true });
      console.log(`Copied native-window-observer to ${nwoTargetPath}`);

      // Install its dependencies (bindings and its transitive deps)
      console.log("Installing native-window-observer dependencies...");
      execSync("npm install --omit=dev --ignore-scripts", {
        cwd: nwoTargetPath,
        stdio: "inherit",
      });
      console.log("native-window-observer dependencies installed successfully");

      // Copy better-sqlite3 to the build (native module)
      const sqliteSourcePath = path.join(__dirname, "node_modules", "better-sqlite3");
      const sqliteTargetPath = path.join(buildPath, "node_modules", "better-sqlite3");

      if (fs.existsSync(sqliteSourcePath)) {
        await fs.promises.cp(sqliteSourcePath, sqliteTargetPath, { recursive: true });
        console.log(`Copied better-sqlite3 to ${sqliteTargetPath}`);

        // Install its dependencies (bindings and its transitive deps)
        console.log("Installing better-sqlite3 dependencies...");
        execSync("npm install --omit=dev --ignore-scripts", {
          cwd: sqliteTargetPath,
          stdio: "inherit",
        });
        console.log("better-sqlite3 dependencies installed successfully");
      } else {
        console.error("better-sqlite3 not found in node_modules!");
      }
    },
  },
};

export default config;
