# Agent 6 UI Design - Momentum

## Design Philosophy

This design embodies a **modern, gradient-driven aesthetic** with a professional yet vibrant visual identity. The key differentiator is the use of a purple-blue gradient as the primary brand element, creating a sophisticated and energetic feel that stands out from typical developer tools.

## Color Palette

### Primary Colors
- **Gradient Primary**: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
  - Purple-blue gradient that defines the brand
  - Used for CTAs, navigation highlights, and accents
- **Dark Navy**: `#1a1a2e` - Primary text and headers
- **Medium Gray**: `#6b7280` - Secondary text and labels
- **Light Background**: `#f5f7fa` - Page backgrounds

### Semantic Colors
- **Success Green**: `#10b981` - Positive trends, successful states
- **Error Red**: `#ef4444` - Negative trends, alerts
- **Warning Orange**: `#f59e0b` - Warnings, costs

### Neutrals
- **White**: `#ffffff` - Card backgrounds, form fields
- **Light Gray**: `#e5e7eb` - Borders, dividers
- **Subtle Gray**: `#f8f9fa` - Hover states, secondary backgrounds

## Typography

- **Font Family**: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
- **Heading Weights**: 700-800 (Bold to Extra Bold)
- **Body Weight**: 400-600 (Regular to Semi-Bold)
- **Size Scale**:
  - Hero Title: 3.5rem
  - Page Title: 2.5rem
  - Section Title: 1.5-2rem
  - Body: 1rem
  - Small: 0.85-0.9rem

## Key Design Elements

### 1. Gradient-Powered Brand Identity
The purple-blue gradient is the signature visual element:
- Logo text treatment
- Primary buttons with shadow effects
- Section icons and badges
- Chart accents

### 2. Glass Morphism Effects
Subtle backdrop blur and transparency:
- Modal overlays
- Metric cards on gradient backgrounds
- Navigation bar

### 3. Depth Through Shadow
Progressive shadow system:
- Subtle: `0 1px 3px rgba(0, 0, 0, 0.1)` - Default cards
- Medium: `0 4px 12px rgba(102, 126, 234, 0.15)` - Hover states
- Strong: `0 20px 60px rgba(0, 0, 0, 0.3)` - Modals, hero sections

### 4. Smooth Interactions
All interactive elements have:
- 0.3s transition timing
- Transform effects on hover (translateY, scale)
- Color transitions for focus states

## Page Designs

### 1. Homepage (homepage.html)
**Purpose**: Marketing landing page for logged-out users

**Key Features**:
- Full-width gradient hero with compelling headline
- Feature grid showcasing 6 core capabilities
- Trust indicators (metrics showcase)
- Integration logos grid
- Strong call-to-action sections

**Layout**:
- Sticky header with navigation
- Hero section with gradient background
- Alternating white/gradient sections
- Grid-based feature cards
- Footer with sitemap

**Unique Elements**:
- Glassmorphic metrics cards on gradient background
- Hover-animated feature cards
- Clean, professional typography hierarchy

### 2. Registration (registration.html)
**Purpose**: New user signup

**Key Features**:
- Split-screen layout (50/50 on desktop)
- Left side: Benefits and branding on gradient background
- Right side: Registration form on white
- Social login options (GitHub, GitLab)
- Real-time password strength indicator
- Mobile-responsive (hides left panel on mobile)

**Form Elements**:
- Name fields (first, last) in grid layout
- Email validation hints
- Organization name input
- Password with strength meter
- Terms acceptance checkbox
- Newsletter opt-in

**Interactive Features**:
- Password strength visualization (weak/medium/strong)
- Focus states with brand color
- Form validation ready

### 3. Onboarding - Data Sources (onboarding-datasources.html)
**Purpose**: Connect development tools during onboarding

**Key Features**:
- Progress stepper showing 4-step journey
- Required vs Optional sections clearly marked
- Card-based data source selection
- Modal configuration dialogs
- Connection testing interface

**Sections**:
1. **Required**: Version Control Systems (GitHub, GitLab, Bitbucket)
2. **Optional**: CI/CD Platforms (Jenkins, CircleCI, GitHub Actions)
3. **Optional**: Code Quality & Security (SonarQube, JIRA, AWS)

**Configuration Modal**:
- Service-specific forms
- Test connection functionality
- Inline help and documentation links
- Clear error states

**Navigation**:
- Sticky bottom bar with progress
- Continue and skip options
- Step-by-step flow

### 4. Dashboard (dashboard.html)
**Purpose**: Main metrics and analytics dashboard

**Key Features**:
- Sticky top navigation with user controls
- Date range selector (7d, 30d, 60d, 90d, custom)
- Export functionality
- Three metric categories: Delivery, Operational, Quality

**Overview Cards**:
- Repositories: Total count
- Contributors: With trend indicator
- Commits: With percentage change
- Pull Requests: With trend

**Metric Sections**:

**Delivery Metrics**:
- Deployment Velocity (bar chart)
- Commit & PR Activity (line chart)
- Work In Progress (bar chart)

**Operational Metrics**:
- Pipeline Success Rate (line chart + activity list)
- Pipeline Duration (stacked bars)
- Infrastructure Costs (trend line)

**Quality Metrics**:
- Code Coverage (trend line)
- Code Quality Metrics (bar chart)
- Security Vulnerabilities (severity breakdown + trend)

**Chart Visualizations**:
- SVG-based line charts with gradients
- CSS-based bar charts with hover effects
- Severity badge system for security
- Consistent 200px height containers

**Interaction Patterns**:
- View All links for detailed views
- Hover effects on all cards
- Trend indicators (up/down arrows)
- Color-coded metrics

## Responsive Design

### Breakpoints
- **Desktop**: 1024px+ (full multi-column layout)
- **Tablet**: 768-1024px (simplified grids)
- **Mobile**: <768px (single column, stacked cards)

### Mobile Optimizations
- Hide navigation tabs on mobile
- Collapse left panels in split layouts
- Stack metric cards vertically
- Reduce font sizes proportionally
- Touch-friendly button sizes (min 44px)

## Component Patterns

### Buttons
- **Primary**: Gradient background with shadow
- **Secondary**: White with border
- **Social**: Icon + text with hover border
- **Icon**: Minimal with hover color change

### Cards
- White background
- 12-16px border radius
- Subtle shadow
- Hover: lift effect + increased shadow
- Consistent padding: 1.5-2.5rem

### Forms
- 2px borders (increase on focus)
- 8px border radius
- Focus ring using box-shadow
- Inline hints and validation
- Accessible labels with required indicators

### Navigation
- Sticky positioning
- Active state highlighting
- Breadcrumb trails
- Progress indicators

## Accessibility Features

- Semantic HTML5 structure
- Color contrast ratios meet WCAG AA
- Focus visible states on all interactive elements
- Keyboard navigation support
- Screen reader friendly labels
- Required field indicators

## File Structure

```
docs/design/sonnet/6/
├── README.md                      # This file
├── homepage.html                  # Marketing homepage
├── registration.html              # User signup page
├── onboarding-datasources.html    # Data source configuration
└── dashboard.html                 # Main dashboard
```

## Design Differentiators

What makes Agent 6's design unique:

1. **Gradient-First Approach**: Unlike flat designs, uses gradients as the primary brand element
2. **Purple-Blue Palette**: Distinctive color scheme vs typical blue/green developer tools
3. **Depth & Dimension**: Layered shadows and hover effects create depth
4. **Modern Glass Effects**: Backdrop blur and transparency for contemporary feel
5. **Chart Integration**: Built-in CSS/SVG chart visualizations
6. **Professional Polish**: Attention to micro-interactions and transitions

## Implementation Notes

All designs use:
- Pure HTML + CSS (no framework dependencies)
- Inline styles for easy modification
- Modern CSS features (Grid, Flexbox, gradients)
- Minimal JavaScript for interactivity
- Self-contained files (no external dependencies)

## Browser Compatibility

Designed for modern browsers:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Uses progressive enhancement for:
- CSS Grid and Flexbox
- CSS Gradients
- Backdrop filters
- SVG graphics

## Next Steps for Implementation

1. Extract inline CSS to separate stylesheets
2. Implement actual chart library (Chart.js, Recharts, etc.)
3. Add form validation logic
4. Connect to backend APIs
5. Add loading states and skeletons
6. Implement responsive images
7. Add animations and transitions library
8. Enhance accessibility features
9. Add dark mode support
10. Implement real-time data updates
