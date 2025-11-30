import type { ForgeConfig } from "@electron-forge/shared-types";
import { VitePlugin } from "@electron-forge/plugin-vite";
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
    asar: false, // Disabled to workaround Forge bugs #3917 (external modules) and #3934 (auto-unpack)why
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
  ],
  hooks: {
    // Workaround for Forge+Vite bug #3917: External native modules are not copied to package
    packageAfterPrune: async (_config, buildPath) => {
      console.log("Copying external native modules and dependencies to build...");

      // Native modules and their required dependencies
      const modulesToCopy = [
        "native-window-observer",
        "better-sqlite3",
        "bindings", // Required by native modules
        "file-uri-to-path", // Required by bindings
      ];

      for (const moduleName of modulesToCopy) {
        const sourcePath = path.join(__dirname, "node_modules", moduleName);
        const targetPath = path.join(buildPath, "node_modules", moduleName);

        if (fs.existsSync(sourcePath)) {
          // dereference: true follows symlinks and copies actual files
          await fs.promises.cp(sourcePath, targetPath, {
            recursive: true,
            dereference: true,
          });
          console.log(`✓ Copied ${moduleName}`);
        } else {
          console.error(`✗ ${moduleName} not found in node_modules!`);
        }
      }

      console.log("Native modules and dependencies copied successfully");
    },
  },
};

export default config;
