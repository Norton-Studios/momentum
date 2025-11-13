# Design Summary - Stripe Bold (Agent 2)

## Design Identity: Stripe Bold

This design takes inspiration from Stripe's dashboard and marketing website, delivering a confident, professional, and energetic aesthetic with bold color choices and structured layouts.

## Color Palette

### Primary Colors
- **Deep Indigo/Navy**: `#0A0D1F` (background), `#0F1629` (cards/surfaces)
- **Vibrant Lime Green**: `#84FF00` (primary accent), `#5EDD00` (gradient end)
- **Cool Grays**: `#1E2943` (borders), `#334155` (hover states)

### Text Colors
- **White**: `#FFFFFF` (headings, primary text)
- **Light Gray**: `#E2E8F0` (body text)
- **Medium Gray**: `#94A3B8` (secondary text)
- **Muted Gray**: `#64748B` (labels, metadata)
- **Dark Gray**: `#475569` (placeholders)

### Accent Colors
- **Success Green**: `#84FF00` (primary actions, positive metrics)
- **Error Red**: `#FF6B6B` (failures, negative metrics)
- **Warning Orange**: `#FF9F6B` (high severity issues)
- **Warning Yellow**: `#FFD66B` (medium severity issues)

## Typography

### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif;
```

### Type Scale
- **Hero Heading**: 72px, weight 800, tight letter-spacing (-0.03em)
- **Page Title**: 36-48px, weight 800, tight letter-spacing (-0.03em)
- **Section Title**: 52px, weight 800 (marketing)
- **Card Title**: 20-24px, weight 700, tight letter-spacing (-0.02em)
- **Metric Value**: 36-48px, weight 800, tight letter-spacing (-0.02em)
- **Body Text**: 14-16px, weight 400-600, tight letter-spacing (-0.01em)
- **Label/Caption**: 12-14px, weight 600-700, wide letter-spacing (0.05em for uppercase)

### Font Weight Strategy
- **800 (Extra Bold)**: Headlines, metric values - commands attention
- **700 (Bold)**: Subheadings, CTAs, labels
- **600 (Semi-bold)**: Navigation, buttons, secondary text
- **400 (Regular)**: Body text

## Layout Patterns

### Grid-Based Structure
- **Max Width**: 1440px for all content containers
- **Padding**: 48px horizontal for desktop
- **Grid Systems**:
  - Stats: 4 columns
  - Features: 3 columns
  - Metrics: 2 columns
  - Data Sources: Auto-fill minmax(280px, 1fr)

### Spacing System
- **Section Gaps**: 120px (between major sections)
- **Card Gaps**: 24-32px
- **Element Gaps**: 12-16px (within cards)
- **Component Padding**: 24-40px (cards), 32-64px (large sections)

### Two-Column Dashboard Layout
- Narrow left content area with structured metric cards
- Clear visual hierarchy with bold section headers
- Consistent card patterns for all metric types

## Component Design

### Navigation
- **Height**: 72px
- **Background**: `#0F1629` with 1px border
- **Sticky positioning** for persistent access
- Active state indicated by lime green underline
- Clean, minimal icon usage

### Buttons
**Primary Button:**
- Gradient background: `linear-gradient(135deg, #84FF00 0%, #5EDD00 100%)`
- Bold weight (700)
- Transforms on hover (translateY(-1px))
- Glowing shadow effect on hover

**Secondary Button:**
- Transparent background
- 1px border (`#1E2943`)
- Subtle hover state (border + background change)

### Cards
- **Background**: `#0F1629`
- **Border**: 1px solid `#1E2943`
- **Border Radius**: 12-16px
- **Top Border Accent**: 3-4px lime green gradient (on select cards)
- **Hover Effect**: Border color change, subtle translateY

### Form Elements
- **Input Background**: `#0A0D1F` (darker than card)
- **Border**: 1px solid `#1E2943`
- **Focus State**: Lime green border + glow shadow
- **Border Radius**: 8px
- Clean, minimal placeholder styling

### Metric Cards
- Bold metric values (36-48px, weight 800)
- Uppercase labels (12-14px, weight 600, letter-spacing)
- Trend indicators with color coding
- Simple bar chart visualizations using gradients
- Consistent padding and spacing

## Visual Mood & Principles

### Confident & Professional
- Bold typography creates authority
- Structured grid layouts convey organization
- High contrast ensures clarity
- Clean, technical aesthetic

### Energetic & Modern
- Vibrant lime green accent provides energy
- Gradients add depth without clutter
- Smooth transitions and hover effects
- Contemporary color temperature (cool + warm contrast)

### Data-Focused
- Metrics prominently displayed
- Clear visual hierarchy
- Scannable information architecture
- Minimal decoration, maximum information

## Design Patterns

### Bold Color Blocking
- Dark backgrounds with vibrant accent
- High saturation lime green for impact
- Strategic use of color for emphasis
- No pastels or muted tones

### Gradient Usage
- Subtle gradients on primary buttons
- Top border accents on key cards
- Chart visualizations
- Background effects (radial gradients for depth)

### Interactive States
- Transform effects (translateY)
- Color transitions (200ms ease)
- Shadow effects on hover
- Border color changes

### Badge System
- Uppercase labels
- Rounded corners (12-20px)
- Transparent backgrounds with borders
- Color-coded by status/severity

## Page-Specific Designs

### Homepage (homepage.html)
- Large hero section (120px top padding)
- Bold gradient text effects
- Feature grid (3 columns)
- Stats showcase
- Marketing-focused with strong CTAs

### Registration (registration.html)
- Centered form card (max-width 480px)
- Social login options
- Feature list highlighting value
- Clean, focused single-purpose design

### Onboarding - Data Sources (onboarding-datasources.html)
- Progress indicator (step-based)
- Card-based data source selection
- Modal configuration forms
- Required vs optional categorization
- Bottom sticky navigation

### Dashboard (dashboard.html)
- Sticky navigation
- 4-column stats grid
- 2-column metric cards
- Breadcrumb navigation
- Date range selector
- Multiple metric categories (Delivery, Operational, Quality)
- Chart placeholders with gradient bars
- Activity feed for recent events

## Accessibility Considerations

- High contrast ratios (dark backgrounds, light text)
- Large, readable text sizes
- Clear focus states on interactive elements
- Semantic HTML structure
- Descriptive labels and ARIA-friendly patterns

## Technical Implementation

### CSS Architecture
- Mobile-first with desktop optimization
- CSS custom properties for consistency (not implemented but recommended)
- Flexbox and Grid for layouts
- Transition effects for polish
- Minimal CSS specificity conflicts

### Responsive Strategy
- Max-width constraints (1440px)
- Flexible grids (auto-fill, minmax)
- Relative units for spacing
- Scalable typography

## Brand Alignment

This design embodies the "Stripe Bold" persona:
- ✓ Deep indigo/purple primary (cool, professional)
- ✓ Vibrant lime green accent (high contrast, energetic)
- ✓ Bold, confident typography
- ✓ Structured, grid-based layouts
- ✓ Professional yet modern aesthetic
- ✓ High saturation color for impact
- ✓ No muted or pastel colors

## Files Created

1. **homepage.html** - Marketing homepage with hero, features, and CTA
2. **registration.html** - User registration form with social login
3. **onboarding-datasources.html** - Data source connection onboarding
4. **dashboard.html** - Organization metrics dashboard

All files located in: `/home/linus/Work/norton-studios/momentum/docs/design/sonnet-v2/2/`
