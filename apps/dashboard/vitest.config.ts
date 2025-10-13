import { defineConfig, mergeConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
import tsconfigPaths from "vite-tsconfig-paths";
import rootConfig from "../../vitest.config";

export default mergeConfig(
  rootConfig,
  defineConfig({
    plugins: [react(), tsconfigPaths()],
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/test/setup.ts"],
      env: {
        SESSION_SECRET: "test-session-secret-for-vitest",
      },
    },
    resolve: {
      alias: {
        "~": path.resolve(__dirname, "./app"),
      },
    },
  }),
);
