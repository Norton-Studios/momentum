import { defineConfig, mergeConfig } from "vitest/config";
import rootConfig from "../../../../vitest.config";

export default mergeConfig(
  rootConfig,
  defineConfig({
    // custom config can go here if needed
  }),
);
