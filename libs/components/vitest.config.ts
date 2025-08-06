import { defineConfig, mergeConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
import rootConfig from "../../vitest.config";

export default mergeConfig(
  rootConfig,
  defineConfig({
    plugins: [react()],
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/test/setup.ts"],
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  }),
);
