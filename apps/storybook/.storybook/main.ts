import type { StorybookConfig } from "@storybook/react-vite";
import { dirname, join } from "node:path";

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
    // Customize the Vite config here
    return config;
  },
};

export default config;
