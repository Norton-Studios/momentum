import type { Meta, StoryObj } from '@storybook/react';
import { StepIndicator } from '@mmtm/components';

const meta: Meta<typeof StepIndicator> = {
  title: 'Onboarding/StepIndicator',
  component: StepIndicator,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const onboardingSteps = [
  {
    id: 'signup',
    label: 'Sign Up',
    description: 'Create your account',
  },
  {
    id: 'data-sources',
    label: 'Data Sources',
    description: 'Connect your tools',
  },
  {
    id: 'team-setup',
    label: 'Team Setup',
    description: 'Organize repositories',
  },
  {
    id: 'review',
    label: 'Review',
    description: 'Complete setup',
  },
];

export const FirstStep: Story = {
  args: {
    steps: onboardingSteps,
    currentStep: 1,
  },
};

export const SecondStep: Story = {
  args: {
    steps: onboardingSteps,
    currentStep: 2,
  },
};

export const ThirdStep: Story = {
  args: {
    steps: onboardingSteps,
    currentStep: 3,
  },
};

export const LastStep: Story = {
  args: {
    steps: onboardingSteps,
    currentStep: 4,
  },
};

export const SimpleSteps: Story = {
  args: {
    steps: [
      { id: 'account', label: 'Account' },
      { id: 'profile', label: 'Profile' },
      { id: 'preferences', label: 'Preferences' },
      { id: 'complete', label: 'Complete' },
    ],
    currentStep: 2,
  },
};