import type { Meta, StoryObj } from '@storybook/react';
import { FormInput } from '@mmtm/components';

const meta: Meta<typeof FormInput> = {
  title: 'Onboarding/FormInput',
  component: FormInput,
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
    label: 'Email Address',
    type: 'email',
    placeholder: 'john@example.com',
  },
};

export const Required: Story = {
  args: {
    label: 'Full Name',
    placeholder: 'John Doe',
    required: true,
  },
};

export const WithIcon: Story = {
  args: {
    label: 'Email',
    type: 'email',
    placeholder: 'your@email.com',
    icon: '✉️',
  },
};

export const WithError: Story = {
  args: {
    label: 'Password',
    type: 'password',
    value: '123',
    error: 'Password must be at least 8 characters long',
  },
};

export const WithSuccess: Story = {
  args: {
    label: 'Username',
    value: 'johndoe',
    success: true,
    helperText: 'Username is available',
  },
};

export const WithHelperText: Story = {
  args: {
    label: 'Organization Name',
    placeholder: 'Acme Corp',
    helperText: "This will be your organization's unique identifier",
  },
};

export const Disabled: Story = {
  args: {
    label: 'API Key',
    value: 'sk_test_1234567890',
    disabled: true,
  },
};

export const PasswordStrength: Story = {
  args: {
    label: 'Password',
    type: 'password',
    placeholder: 'Enter a strong password',
    helperText: 'Use 8+ characters, mix of letters, numbers & symbols',
    required: true,
  },
};