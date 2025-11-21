import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  // @ts-expect-error - Vitest types are compatible at runtime
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["node_modules", "e2e", "build", ".react-router"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: ["node_modules/**", "build/**", ".react-router/**", "e2e/**", "**/*.config.{js,ts}", "**/*.d.ts", "**/types/**"],
    },
  },
});
