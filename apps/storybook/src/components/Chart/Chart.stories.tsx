import type { Meta, StoryObj } from '@storybook/react';
import { Chart } from '@mmtm/components';

const meta: Meta<typeof Chart> = {
  title: 'Dashboard/Chart',
  component: Chart,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ width: '600px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const LineChart: Story = {
  args: {
    type: 'line',
    title: 'Delivery Velocity Trend',
    data: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [
        {
          label: 'Commits',
          data: [65, 78, 82, 91, 85, 97],
          borderColor: '#667eea',
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          tension: 0.4,
          fill: true,
        },
        {
          label: 'Deployments',
          data: [45, 52, 58, 65, 61, 72],
          borderColor: '#f093fb',
          backgroundColor: 'rgba(240, 147, 251, 0.1)',
          tension: 0.4,
          fill: true,
        },
      ],
    },
  },
};

export const BarChart: Story = {
  args: {
    type: 'bar',
    title: 'Team Performance',
    data: {
      labels: ['Frontend', 'Backend', 'DevOps', 'QA', 'Mobile'],
      datasets: [
        {
          label: 'Velocity',
          data: [85, 92, 78, 88, 81],
          backgroundColor: [
            'rgba(102, 126, 234, 0.8)',
            'rgba(118, 75, 162, 0.8)',
            'rgba(240, 147, 251, 0.8)',
            'rgba(79, 172, 254, 0.8)',
            'rgba(168, 224, 99, 0.8)',
          ],
        },
      ],
    },
  },
};

export const DoughnutChart: Story = {
  args: {
    type: 'doughnut',
    title: 'Pipeline Success Rate',
    data: {
      labels: ['Success', 'Failed', 'Cancelled'],
      datasets: [
        {
          data: [85, 10, 5],
          backgroundColor: [
            'rgba(78, 205, 196, 0.8)',
            'rgba(255, 107, 107, 0.8)',
            'rgba(255, 217, 61, 0.8)',
          ],
          borderWidth: 0,
        },
      ],
    },
    height: 400,
  },
};

export const RadarChart: Story = {
  args: {
    type: 'radar',
    title: 'Team Skills Matrix',
    data: {
      labels: ['Code Quality', 'Velocity', 'Collaboration', 'Testing', 'Documentation', 'Innovation'],
      datasets: [
        {
          label: 'Frontend Team',
          data: [85, 92, 78, 88, 72, 95],
          backgroundColor: 'rgba(102, 126, 234, 0.2)',
          borderColor: 'rgba(102, 126, 234, 1)',
          pointBackgroundColor: 'rgba(102, 126, 234, 1)',
        },
        {
          label: 'Backend Team',
          data: [90, 85, 82, 92, 85, 78],
          backgroundColor: 'rgba(240, 147, 251, 0.2)',
          borderColor: 'rgba(240, 147, 251, 1)',
          pointBackgroundColor: 'rgba(240, 147, 251, 1)',
        },
      ],
    },
  },
};