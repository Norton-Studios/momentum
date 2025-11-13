# Apple Minimalist Design - Agent 1

## Design Philosophy

This design embodies the Apple aesthetic: refined, spacious, and focused on content over chrome. Every element serves a purpose, and there's generous whitespace throughout to let the content breathe.

## Color Palette

**Monochromatic Foundation:**
- Primary Background: `#ffffff` (Pure White)
- Secondary Background: `#f5f5f7` (Light Gray)
- Primary Text: `#1d1d1f` (Near Black)
- Secondary Text: `#6e6e73` (Medium Gray)
- Tertiary/Borders: `#d2d2d7` (Light Border Gray)

**Single Accent Color:**
- Primary Accent: `#06c` (Apple Blue)
- Hover State: `#0077ed` (Lighter Blue)
- Active State: `#0055bb` (Darker Blue)

**System Colors (Minimal Use):**
- Success: `#34c759` (Green - for positive metrics)
- Error: `#ff3b30` (Red - for negative metrics/critical alerts)
- Warning: `#ff9500` (Orange - for high priority items)
- Caution: `#ffcc00` (Yellow - for medium priority)

## Typography

**Font Stack:**
```css
-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif
```

**Hierarchy:**
- Hero Headline: 64px, 700 weight, -0.02em letter-spacing
- Page Title: 40px, 700 weight, -0.02em letter-spacing
- Section Title: 32px, 700 weight, -0.02em letter-spacing
- Card Title: 24px, 600 weight
- Body Large: 21px, 300 weight
- Body: 17px, 300-400 weight
- Body Small: 14px, 300-400 weight
- Caption: 13px, 400 weight

**Key Characteristics:**
- Negative letter-spacing on headlines for tighter, more refined look
- Light (300) and Regular (400) weights for body text
- Semibold (600) and Bold (700) for hierarchy
- Generous line-height (1.6 for body, 1.1-1.5 for headings)

## Layout Principles

### 1. Generous Whitespace
- Container max-width: 1000-1400px depending on page type
- Section spacing: 80-120px vertical margins
- Card spacing: 20-40px gaps in grids
- Internal padding: 32-64px in cards

### 2. Single-Column Focus
- Homepage: Centered single column with sections
- Registration: Centered card, max 480px wide
- Dashboard: Max 1400px container, grid-based but feels unified

### 3. Minimal Chrome
- Navigation: Fixed 48-52px height, translucent background with blur
- No visible borders except subtle 1px dividers
- Shadows: Extremely subtle (0 2px-4px 8px-20px rgba(0,0,0,0.04-0.08))

### 4. Content Cards
- Border-radius: 16-18px (soft, rounded corners)
- Background: Pure white on gray background
- Elevation: Minimal shadow, increases on hover
- Hover: Subtle translateY(-2px to -4px) with shadow increase

## Component Design

### Navigation
- Translucent white background with backdrop-filter blur
- Thin bottom border for subtle separation
- Minimal height (48-52px)
- Logo: Simple text, no icon clutter
- Links: Gray by default, black on hover
- CTA: Blue pill button, rounded (border-radius: 980px)

### Buttons
**Primary (Blue):**
- Background: `#06c`
- Padding: 12-14px vertical, 24-28px horizontal
- Border-radius: 10-12px (smaller buttons) or 980px (pill style)
- No border
- Smooth transition on hover

**Secondary/Ghost:**
- No background or white background
- Border: 1px solid `#d2d2d7`
- Color: `#1d1d1f`
- Hover: Light gray background `#f5f5f7`

### Forms
**Inputs:**
- Border: 1px solid `#d2d2d7`
- Border-radius: 10-12px
- Padding: 12-14px
- Focus: Border color changes to `#06c`, 4px blur shadow in accent color
- No harsh shadows or heavy styling

**Layout:**
- Labels above inputs
- Required fields marked with asterisk
- Help text: 13px gray below input
- Generous spacing between fields (24px)

### Cards/Metrics
**Structure:**
- White background on gray page background
- 16-18px border-radius
- 24-48px internal padding
- 2-8px shadow with very low opacity

**Metric Display:**
- Large numbers: 32-56px, bold
- Labels: 14px, gray, above numbers
- Trends: Small indicators with arrows and percentages
- Charts: Light gray placeholder areas, soft edges

### Progress Indicators
- Minimal step indicator
- Thin 2px line connecting steps
- Circular step numbers
- Active state: Blue background
- Completed: Blue with checkmark
- Inactive: Gray outline

## Interaction Design

### Hover States
- Subtle color transitions (0.2s ease)
- Slight vertical movement on cards (-2px to -4px)
- Shadow enhancement
- No dramatic color shifts

### Focus States
- 4px blur ring around focused elements
- Blue accent color with 10% opacity
- Smooth transition

### Transitions
- Duration: 0.2-0.3s
- Easing: ease or ease-out
- Applied to: colors, transforms, shadows
- No bouncy or dramatic animations

## Responsive Approach

### Desktop (>1024px)
- Full grid layouts (3-4 columns)
- Wide containers
- Visible navigation

### Tablet (768-1024px)
- 2 column grids
- Slightly narrower containers
- Collapsible navigation

### Mobile (<768px)
- Single column
- Stacked cards
- Hidden navigation (hamburger)
- Reduced padding

## Key Differentiators

### What Makes This "Apple Minimalist":

1. **Restraint**: Only one accent color, no gradients, no multiple colors fighting for attention

2. **Whitespace**: Generous margins and padding throughout - content has room to breathe

3. **Typography**: System fonts, varied weights for hierarchy, tight letter-spacing on headlines

4. **Simplicity**: Minimal navigation, hidden complexity, progressive disclosure

5. **Refinement**: Subtle shadows, soft corners, smooth transitions

6. **Focus**: Large headline statements, clear hierarchy, obvious primary actions

7. **Quality**: Attention to detail in spacing, alignment, and visual balance

## Files Created

1. **homepage.html** - Marketing page with hero, features, stats, and CTA
2. **registration.html** - Clean account creation form
3. **onboarding-datasources.html** - Data source connection with step indicator
4. **dashboard.html** - Organization metrics overview

All files are self-contained with embedded CSS and minimal JavaScript for demonstration purposes.
