import type { Meta, StoryObj } from "@storybook/react";
import { Alert } from "@mmtm/components";

const meta: Meta<typeof Alert> = {
  title: "Onboarding/Alert",
  component: Alert,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ width: "600px" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {
  args: {
    variant: "info",
    title: "Secure Integration",
    children: "All connections use secure OAuth or token-based authentication. Your credentials are encrypted and never stored in plain text.",
  },
};

export const Success: Story = {
  args: {
    variant: "success",
    title: "Setup Complete!",
    children: "Your account has been successfully created and configured.",
  },
};

export const Warning: Story = {
  args: {
    variant: "warning",
    title: "Limited Access",
    children: "You have read-only access to this repository. Some features may be limited.",
  },
};

export const ErrorAlert: Story = {
  args: {
    variant: "error",
    title: "Connection Failed",
    children: "Unable to connect to the data source. Please check your credentials and try again.",
  },
};

export const Dismissible: Story = {
  args: {
    variant: "info",
    children: "This alert can be dismissed by clicking the X button.",
    dismissible: true,
    onDismiss: () => console.log("Alert dismissed"),
  },
};

export const NoTitle: Story = {
  args: {
    variant: "info",
    children: "This is a simple alert without a title.",
  },
};
