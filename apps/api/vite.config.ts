import { defineConfig } from "vite";
import { VitePluginNode } from "vite-plugin-node";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  server: {
    port: 3001,
  },
  watch: {
    ignored: ["**/node_modules/**", "**/dist/**"],
  },
  plugins: [
    ...VitePluginNode({
      adapter: "express",
      appPath: "./src/index.ts",
      exportName: "viteNodeApp",
      tsCompiler: "esbuild",
    }),
    tsconfigPaths(),
  ],
  build: {
    rollupOptions: {
      output: {
        format: "esm",
      },
    },
  },
});
