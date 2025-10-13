import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@mmtm/components": path.resolve(__dirname, "../../libs/components/src/index.ts"),
      "@mmtm/components/styles": path.resolve(__dirname, "../../libs/components/src/styles/globals.css"),
    },
  },
});
