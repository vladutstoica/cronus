import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "main",
          include: [
            "src/main/**/__tests__/**/*.test.ts",
            "src/shared/**/__tests__/**/*.test.ts",
          ],
          exclude: ["node_modules", "out", ".vite"],
          globals: true,
          environment: "node",
          setupFiles: ["./src/main/__mocks__/setup.ts"],
          coverage: {
            provider: "v8",
            include: ["src/main/**/*.ts", "src/shared/**/*.ts"],
            exclude: [
              "src/main/**/__tests__/**",
              "src/main/**/__mocks__/**",
              "src/shared/**/__tests__/**",
            ],
          },
        },
        resolve: {
          alias: {
            "@shared": resolve(__dirname, "src/shared"),
          },
        },
      },
      {
        test: {
          name: "renderer",
          include: ["src/renderer/**/__tests__/**/*.test.ts"],
          exclude: ["node_modules", "out", ".vite"],
          globals: true,
          environment: "jsdom",
          setupFiles: ["./src/renderer/src/__tests__/setup.ts"],
          coverage: {
            provider: "v8",
            include: ["src/renderer/src/**/*.ts", "src/renderer/src/**/*.tsx"],
            exclude: ["src/renderer/src/**/__tests__/**"],
          },
        },
        resolve: {
          alias: {
            "@shared": resolve(__dirname, "src/shared"),
            "@renderer": resolve(__dirname, "src/renderer/src"),
          },
        },
      },
    ],
  },
});
