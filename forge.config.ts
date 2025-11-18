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
      unpack: "**/*.node",
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
          entry: "src/preload/index.ts",
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
          config: "vite.renderer.config.ts",
        },
        {
          name: "floating_window",
          config: "vite.renderer.config.ts",
        },
      ],
    }),
    new AutoUnpackNativesPlugin({}),
  ],
  hooks: {
    packageAfterPrune: async (_config, buildPath) => {
      // Install external dependencies that Vite didn't bundle
      const externalDeps = ["native-window-observer"];

      console.log("Installing external dependencies:", externalDeps);

      for (const dep of externalDeps) {
        const sourcePath = path.join(__dirname, "native-modules", dep);
        const targetPath = path.join(buildPath, "node_modules", dep);

        // Create node_modules directory if it doesn't exist
        const nodeModulesPath = path.join(buildPath, "node_modules");
        if (!fs.existsSync(nodeModulesPath)) {
          fs.mkdirSync(nodeModulesPath, { recursive: true });
        }

        // Copy the native module directory
        await fs.promises.cp(sourcePath, targetPath, { recursive: true });
        console.log(`Copied ${dep} to ${targetPath}`);
      }
    },
  },
};

export default config;
