import type { StorybookConfig } from "@storybook/react-vite";
import { dirname, join } from "node:path";
import path from "node:path";

function getAbsolutePath(value: string): string {
  return dirname(require.resolve(join(value, "package.json")));
}

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(js|jsx|ts|tsx|mdx)"],
  addons: [getAbsolutePath("@storybook/addon-links")],
  framework: {
    name: getAbsolutePath("@storybook/react-vite"),
    options: {},
  },
  viteFinal: async (config) => {
    // TODO: fix this hack when storybook learns how to resolve aliases from vite config
    if (config.resolve) {
      config.resolve.alias = [
        { find: /^@mmtm\/components\/styles$/, replacement: path.resolve(__dirname, "../../../libs/components/src/styles/globals.css") },
        { find: /^@mmtm\/components$/, replacement: path.resolve(__dirname, "../../../libs/components/src/index.ts") },
        ...(Array.isArray(config.resolve.alias) ? config.resolve.alias : [])
      ];
    }
    return config;
  },
};

export default config;
