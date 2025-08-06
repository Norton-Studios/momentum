import type { Meta, StoryObj } from '@storybook/react';
import { Card } from '@mmtm/components';

const meta: Meta<typeof Card> = {
  title: 'Components/Card',
  component: Card,
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
    title: 'Default Card',
    description: 'This is a basic card with title and description',
  },
};

export const WithIcon: Story = {
  args: {
    icon: '🚀',
    title: 'Feature Card',
    description: 'Cards can have icons to make them more visual',
  },
};

export const Clickable: Story = {
  args: {
    icon: '⚙️',
    title: 'Clickable Card',
    description: 'Click me to see the interaction',
    onClick: () => console.log('Card clicked!'),
  },
};

export const Selected: Story = {
  args: {
    icon: '✅',
    title: 'Selected Card',
    description: 'This card is in a selected state',
    selected: true,
    onClick: () => {},
  },
};

export const Gradient: Story = {
  args: {
    icon: '🌟',
    title: 'Gradient Card',
    description: 'A card with gradient background',
    variant: 'gradient',
  },
};

export const Outlined: Story = {
  args: {
    title: 'Outlined Card',
    description: 'A simple outlined card variant',
    variant: 'outlined',
  },
};

export const Disabled: Story = {
  args: {
    icon: '🚫',
    title: 'Disabled Card',
    description: 'This card is disabled and cannot be clicked',
    disabled: true,
    onClick: () => {},
  },
};

export const WithCustomContent: Story = {
  args: {
    title: 'Custom Content Card',
    children: (
      <div>
        <p style={{ marginBottom: '8px' }}>This card has custom content:</p>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li>Feature 1</li>
          <li>Feature 2</li>
          <li>Feature 3</li>
        </ul>
      </div>
    ),
  },
};

export const DataSourceCard: Story = {
  args: {
    icon: (
      <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
      </svg>
    ),
    title: 'GitHub',
    description: 'Connect your GitHub repositories',
    variant: 'outlined',
    onClick: () => {},
  },
};