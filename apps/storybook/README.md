# Momentum Storybook

Component documentation and playground for the Momentum developer productivity platform, built with React, TypeScript, and Storybook.

## Overview

This Storybook showcases reusable React components from @mmtm/components based on two distinct themes:
- **Dashboard Theme**: Gradient-based colorful design (design-4)
- **Onboarding Theme**: Professional enterprise design (onboarding-flow-2)

## Features

- 🎨 Beautiful, accessible components
- 📊 Chart.js integration for data visualization
- 🌈 Gradient-based color system
- 📱 Fully responsive
- ♿ Accessibility-first approach
- 📚 Comprehensive Storybook documentation
- 🏗️ TypeScript support

## Installation

```bash
# From the monorepo root
yarn install

# Navigate to the storybook app
cd apps/storybook

# Start Storybook
yarn storybook
```

## Components

### Dashboard Components

- **Button**: Versatile button with multiple variants and gradient support
- **MetricCard**: Display key metrics with trends and sparklines
- **DateRangeSelector**: Interactive date range picker
- **Sidebar**: Navigation sidebar with nested menu support
- **Chart**: Wrapper for Chart.js with line, bar, doughnut, and radar charts

### Onboarding Components

- **StepIndicator**: Progress indicator for multi-step workflows
- **FormInput**: Enhanced input component with validation states
- **Card**: Flexible card component for selections and content

## Usage

```typescript
import { Button, MetricCard, Chart } from '@mmtm/components';

// Button example
<Button variant="primary" gradient onClick={handleClick}>
  Click me
</Button>

// MetricCard example
<MetricCard
  title="Pipeline Stability"
  value="94.2%"
  trend={{ value: 8, direction: 'up' }}
  gradient="stability"
/>

// Chart example
<Chart
  type="line"
  data={chartData}
  title="Delivery Velocity"
/>
```

## Storybook

View all components and their variations:

```bash
yarn storybook
```

This will start Storybook on http://localhost:6006

## Building

```bash
# Build Storybook static files
yarn build-storybook

# Build the component library
yarn build:lib
```

## Design Tokens

The design system uses CSS custom properties for consistent theming:

- Colors: Primary, secondary, accent, semantic colors
- Gradients: Multiple gradient presets
- Spacing: Consistent spacing scale
- Typography: Font families and sizes
- Shadows: Elevation system
- Transitions: Animation timings

## Contributing

1. Create new components in `src/components/ComponentName/`
2. Include TypeScript types
3. Add CSS modules for styling
4. Create Storybook stories
5. Export from `src/index.ts`

## License

Private - Part of the Momentum platform