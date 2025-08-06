import type { Meta, StoryObj } from '@storybook/react';
import { DateRangeSelector } from '@mmtm/components';

const meta: Meta<typeof DateRangeSelector> = {
  title: 'Dashboard/DateRangeSelector',
  component: DateRangeSelector,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const CustomRanges: Story = {
  args: {
    ranges: [
      { label: 'Today', value: 'today', days: 1 },
      { label: 'This Week', value: 'week', days: 7 },
      { label: 'This Month', value: 'month', days: 30 },
      { label: 'This Quarter', value: 'quarter', days: 90 },
      { label: 'This Year', value: 'year', days: 365 },
    ],
    defaultValue: 'month',
  },
};

export const WithCallback: Story = {
  args: {
    onChange: (range) => console.log('Selected range:', range),
  },
};