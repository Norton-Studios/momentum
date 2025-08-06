import type { Meta, StoryObj } from '@storybook/react';
import { Toggle } from '@mmtm/components';
import { useState } from 'react';

const meta: Meta<typeof Toggle> = {
  title: 'Components/Toggle',
  component: Toggle,
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

export const Checked: Story = {
  args: {
    defaultChecked: true,
  },
};

export const WithLabel: Story = {
  args: {
    label: 'Enable notifications',
  },
};

export const LabelLeft: Story = {
  args: {
    label: 'Dark mode',
    labelPosition: 'left',
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    label: 'Small toggle',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    label: 'Large toggle',
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    label: 'Disabled toggle',
  },
};

export const DisabledChecked: Story = {
  args: {
    disabled: true,
    checked: true,
    label: 'Disabled checked',
  },
};

export const Controlled: Story = {
  render: () => {
    const ControlledExample = () => {
      const [isEnabled, setIsEnabled] = useState(false);

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Toggle
            checked={isEnabled}
            onChange={setIsEnabled}
            label={`Feature is ${isEnabled ? 'enabled' : 'disabled'}`}
          />
          <div style={{ 
            padding: '12px', 
            background: isEnabled ? '#d1fae5' : '#fee2e2',
            borderRadius: '8px',
            fontSize: '14px',
            color: isEnabled ? '#065f46' : '#991b1b',
          }}>
            Status: {isEnabled ? '✅ Active' : '❌ Inactive'}
          </div>
        </div>
      );
    };
    return <ControlledExample />;
  },
};

export const SettingsList: Story = {
  render: () => (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '20px',
      padding: '20px',
      background: 'white',
      borderRadius: '12px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      width: '300px',
    }}>
      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Notification Settings</h3>
      <Toggle label="Email notifications" defaultChecked />
      <Toggle label="Push notifications" />
      <Toggle label="SMS alerts" />
      <Toggle label="Weekly digest" defaultChecked />
      <Toggle label="Marketing emails" disabled />
    </div>
  ),
};