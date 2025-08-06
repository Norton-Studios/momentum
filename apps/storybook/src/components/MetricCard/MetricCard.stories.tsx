import type { Meta, StoryObj } from "@storybook/react";
import { MetricCard } from "@mmtm/components";

const meta: Meta<typeof MetricCard> = {
  title: "Dashboard/MetricCard",
  component: MetricCard,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ width: "300px" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const CVECount: Story = {
  args: {
    title: "CVE Count",
    value: "23",
    trend: { value: 12, direction: "down" },
    gradient: "cve",
    icon: "🛡️",
  },
};

export const PipelineStability: Story = {
  args: {
    title: "Pipeline Stability",
    value: "94.2%",
    trend: { value: 8, direction: "up" },
    gradient: "stability",
    icon: "✅",
  },
};

export const DeliveryVelocity: Story = {
  args: {
    title: "Delivery Velocity",
    value: "2.4x",
    trend: { value: 15, direction: "up" },
    gradient: "velocity",
    icon: "🚀",
  },
};

export const Performance: Story = {
  args: {
    title: "Avg Response Time",
    value: "1.2s",
    trend: { value: 2, direction: "up" },
    gradient: "performance",
    icon: "⚡",
  },
};

export const WithSparkline: Story = {
  args: {
    title: "Weekly Commits",
    value: "432",
    trend: { value: 23, direction: "up" },
    gradient: "primary",
    sparklineData: [20, 35, 30, 45, 40, 60, 55, 70, 65, 80, 75, 90],
  },
};

export const NoTrend: Story = {
  args: {
    title: "Active Teams",
    value: "12",
    gradient: "primary",
    icon: "👥",
  },
};
