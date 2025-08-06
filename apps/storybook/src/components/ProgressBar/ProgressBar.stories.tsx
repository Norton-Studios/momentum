import type { Meta, StoryObj } from '@storybook/react';
import { ProgressBar } from '@mmtm/components';

const meta: Meta<typeof ProgressBar> = {
  title: 'Components/ProgressBar',
  component: ProgressBar,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '400px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: 60,
  },
};

export const WithLabel: Story = {
  args: {
    value: 75,
    showLabel: true,
  },
};

export const Success: Story = {
  args: {
    value: 100,
    variant: 'success',
    showLabel: true,
  },
};

export const Warning: Story = {
  args: {
    value: 45,
    variant: 'warning',
    showLabel: true,
  },
};

export const Danger: Story = {
  args: {
    value: 25,
    variant: 'danger',
    showLabel: true,
  },
};

export const Striped: Story = {
  args: {
    value: 60,
    striped: true,
  },
};

export const Animated: Story = {
  args: {
    value: 70,
    striped: true,
    animated: true,
  },
};

export const Small: Story = {
  args: {
    value: 50,
    size: 'sm',
  },
};

export const Large: Story = {
  args: {
    value: 80,
    size: 'lg',
    showLabel: true,
  },
};

export const Multiple: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '400px' }}>
      <div>
        <div style={{ marginBottom: '4px', fontSize: '14px' }}>Setup Progress</div>
        <ProgressBar value={25} variant="danger" />
      </div>
      <div>
        <div style={{ marginBottom: '4px', fontSize: '14px' }}>Data Import</div>
        <ProgressBar value={60} variant="warning" striped animated />
      </div>
      <div>
        <div style={{ marginBottom: '4px', fontSize: '14px' }}>Configuration</div>
        <ProgressBar value={100} variant="success" showLabel />
      </div>
    </div>
  ),
};