import type { Meta, StoryObj } from '@storybook/react';
import { Divider } from '@mmtm/components';

const meta: Meta<typeof Divider> = {
  title: 'Components/Divider',
  component: Divider,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '400px', height: '200px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  args: {
    orientation: 'horizontal',
  },
};

export const WithText: Story = {
  args: {
    text: 'or create account with email',
  },
};

export const ContinueWith: Story = {
  args: {
    text: 'OR',
  },
};

export const Vertical: Story = {
  args: {
    orientation: 'vertical',
  },
  decorators: [
    (Story) => (
      <div style={{ display: 'flex', height: '100px', alignItems: 'center' }}>
        <div>Left Content</div>
        <Story />
        <div>Right Content</div>
      </div>
    ),
  ],
};