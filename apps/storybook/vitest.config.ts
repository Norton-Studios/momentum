import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";
import rootConfig from "../../vitest.config";

export default mergeConfig(
  rootConfig,
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: "./src/test/setup.ts",
    },
  }),
);
