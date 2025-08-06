import type { Meta, StoryObj } from '@storybook/react';
import { Sidebar } from '@mmtm/components';

const meta: Meta<typeof Sidebar> = {
  title: 'Dashboard/Sidebar',
  component: Sidebar,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ height: '100vh', display: 'flex' }}>
        <Story />
        <div style={{ flex: 1, padding: '2rem', background: '#f7fafc' }}>
          <h2>Main Content Area</h2>
        </div>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

const navigationItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: '📊',
  },
  {
    id: 'organization',
    label: 'Organization',
    icon: '🏢',
  },
  {
    id: 'teams',
    label: 'Teams',
    icon: '👥',
    children: [
      { id: 'teams-all', label: 'All Teams Comparison' },
      { id: 'teams-frontend', label: 'Frontend Team' },
      { id: 'teams-backend', label: 'Backend Team' },
      { id: 'teams-devops', label: 'DevOps Team' },
    ],
  },
  {
    id: 'contributors',
    label: 'Contributors',
    icon: '👤',
    children: [
      { id: 'contributors-all', label: 'All Contributors' },
      { id: 'contributors-individual', label: 'Individual View' },
    ],
  },
];

export const Default: Story = {
  args: {
    items: navigationItems,
    activeItem: 'dashboard',
  },
};

export const WithLogo: Story = {
  args: {
    items: navigationItems,
    activeItem: 'teams-frontend',
    logo: (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            background: 'var(--gradient-primary)',
            borderRadius: '8px',
          }}
        />
        <span style={{ fontWeight: 600, fontSize: '1.25rem' }}>Momentum</span>
      </div>
    ),
  },
};

export const WithFooter: Story = {
  args: {
    items: navigationItems,
    activeItem: 'organization',
    logo: (
      <div style={{ fontWeight: 600, fontSize: '1.25rem' }}>Momentum</div>
    ),
    footer: (
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'var(--gradient-secondary)',
          }}
        />
        <div>
          <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>John Doe</div>
          <div style={{ fontSize: '0.75rem', color: '#718096' }}>Admin</div>
        </div>
      </div>
    ),
  },
};