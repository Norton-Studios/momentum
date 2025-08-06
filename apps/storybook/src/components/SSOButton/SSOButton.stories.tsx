import type { Meta, StoryObj } from "@storybook/react";
import { SSOButton } from "@mmtm/components";

const meta: Meta<typeof SSOButton> = {
  title: "Onboarding/SSOButton",
  component: SSOButton,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ width: "400px" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Google: Story = {
  args: {
    provider: "google",
  },
};

export const Microsoft: Story = {
  args: {
    provider: "microsoft",
  },
};

export const GitHub: Story = {
  args: {
    provider: "github",
  },
};

export const GitLab: Story = {
  args: {
    provider: "gitlab",
  },
};

export const Bitbucket: Story = {
  args: {
    provider: "bitbucket",
  },
};

export const CustomLabel: Story = {
  args: {
    provider: "google",
    children: "Sign in with Google",
  },
};

export const FullWidth: Story = {
  args: {
    provider: "github",
    fullWidth: true,
  },
};

export const AllProviders: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <SSOButton provider="google" fullWidth />
      <SSOButton provider="microsoft" fullWidth />
      <SSOButton provider="github" fullWidth />
      <SSOButton provider="gitlab" fullWidth />
      <SSOButton provider="bitbucket" fullWidth />
    </div>
  ),
};
