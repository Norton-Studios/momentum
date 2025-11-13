# Design 6: Figma Collaborative Designer

## Design Identity

**Persona**: Figma Collaborative
**Reference Inspiration**: Figma editor, Figma.com interface
**Visual Mood**: Creative, collaborative, team-oriented, playful-professional, innovative

## Color System

### Multi-Color Approach
This design uses a vibrant multi-color system inspired by Figma's collaborative nature:

- **Red** (#ff6b6b): Delivery metrics, primary actions, deployment tracking
- **Blue** (#4f46e5): Operational metrics, CI/CD, primary buttons
- **Green** (#10b981): Quality metrics, success states, code coverage
- **Purple** (#8b5cf6): Collaboration features, team metrics, code reviews
- **Pink** (#ec4899): Security metrics, vulnerabilities, individual focus
- **Orange** (#f59e0b): Efficiency metrics, cycle time, performance

### Color Temperature
Mixed temperature palette combining warm (red, orange, pink) and cool (blue, green, purple) colors to create an energetic, balanced feel.

### Saturation
Medium-high saturation creates a vibrant, professional appearance that's energizing without being overwhelming.

## Layout Pattern

### Canvas-Based Feel
- Floating, overlapping card elements
- Layered components with depth
- Flexible workspace-style arrangements
- White space used intentionally to create "breathing room"

### Collaborative Elements
- Team avatar stacks showing active users
- Presence indicators throughout
- Activity feeds showing real-time collaboration
- Shared metric ownership visualization

### Card System
- Cards with rounded corners (16-24px border radius)
- Subtle shadows for depth (0 4px 20px rgba(0,0,0,0.08))
- Hover states that lift cards (translateY and increased shadow)
- Color-coded left borders for category identification

## Typography

### Font Family
**Inter**: A rounded, friendly sans-serif that balances professionalism with approachability

### Hierarchy
- **Headings**: 700 weight, larger sizes (2rem - 3.5rem)
- **Body**: 400-500 weight, readable sizes (0.9rem - 1.15rem)
- **Labels**: 600 weight, uppercase with letter-spacing for emphasis
- **Metrics**: 700 weight, large and bold (2rem - 2.5rem)

### Character
- Slightly rounded letterforms
- Multiple weights for flexibility
- Clear hierarchy through size and weight combinations

## Component Design

### Navigation
- Sticky header with logo and navigation tabs
- Tab-based switching between views
- Collaborative user presence (avatar stack)
- Settings and profile access icons

### Stat Cards
- Color-coded left border (4px)
- Large metric values (2rem, 700 weight)
- Change indicators with colored badges
- Hover lift effect for interactivity

### Metric Cards
- Icon + title headers with colored backgrounds
- Category badges (red, blue, green, purple, pink, orange)
- Chart visualizations with gradient fills
- Detailed breakdowns in grid layouts
- Overlapping design possibility

### Badges and Tags
- Rounded pill shapes (20px border radius)
- Background colors at 15% opacity with darker text
- Each category has its own color
- Multiple badges can appear together

### Buttons
- Primary: Blue gradient with shadow
- Secondary: White with border
- Rounded corners (10-12px)
- Hover states with lift animation
- Icon + text combinations

### Avatars
- Circular with colored backgrounds
- White border (2-3px) for overlap
- Overlapping layout (negative margin)
- Initials or icons inside
- Small shadows for depth

## Collaborative Features

### Team Presence
- Avatar stacks showing active team members
- Color-coded avatars for individual identity
- "+N" indicators for additional users
- Presence in header and throughout content

### Activity Feeds
- Real-time team activity cards
- Avatar + name + action layout
- White cards on subtle colored backgrounds
- Grouped by relevance

### Shared Metrics
- Multiple contributors shown on metrics
- Team ownership visualization
- Collaborative context emphasized

## Interaction Design

### Hover States
- Card lift: translateY(-4px to -8px)
- Shadow increase for depth
- Subtle scale or color changes
- Smooth transitions (0.3s cubic-bezier)

### Active States
- Colored backgrounds for active tabs
- Gradient fills for selected items
- Border highlights
- Shadow emphasis

### Transitions
- Smooth animations (0.2s - 0.3s)
- Cubic-bezier easing for natural feel
- Transform-based movements
- Opacity fades

## Page-Specific Design

### Homepage
- Hero section with gradient background
- Multi-colored feature cards
- Overlapping demonstration cards
- Team collaboration section
- Colorful badges throughout

### Registration
- Split layout: branding + form
- Multi-color feature highlights
- Tabbed interface (sign up/sign in)
- Color-coded form labels
- Social auth buttons
- Colorful trust badges

### Onboarding - Data Sources
- Progress stepper with colored states
- Team collaboration callout
- Grid of data source cards
- Color-coded by category (VCS, CI/CD, Quality, PM, Cloud)
- Connected state visualization
- Icon-based identification

### Dashboard
- Multi-section layout (Delivery, Quality, Collaboration)
- Color-coded stat cards
- Team activity feed at top
- Multiple colored metric cards
- Chart visualizations with gradients
- Section headers with icons
- Presence indicators throughout

## Design Principles

### 1. Color Diversity
Each feature category has its own distinct color, making navigation and understanding intuitive.

### 2. Collaborative First
Team presence, activity feeds, and shared ownership are visible throughout the interface.

### 3. Playful Professionalism
Vibrant colors and rounded shapes create approachability while maintaining business credibility.

### 4. Visual Hierarchy
Color, size, weight, and position work together to guide attention and understanding.

### 5. Depth and Layering
Shadows, overlapping elements, and hover effects create a three-dimensional feel.

### 6. Flexibility
The design supports various content types and layouts without feeling constrained.

## Technical Implementation

### CSS Features
- CSS Grid for flexible layouts
- Flexbox for component alignment
- CSS gradients for depth and visual interest
- Transform animations for interactions
- Custom properties for color consistency
- Media queries for responsive behavior

### Accessibility
- Sufficient color contrast (WCAG AA+)
- Focus states for keyboard navigation
- Semantic HTML structure
- Readable font sizes
- Alternative text for icons

### Performance
- Minimal animations
- Efficient selectors
- Optimized images
- Progressive enhancement

## Differentiators from Other Designs

Unlike minimalist or monochromatic designs, this Figma-inspired approach:
- Uses multiple vibrant colors throughout
- Emphasizes team collaboration visually
- Creates a more playful, creative atmosphere
- Shows presence and activity prominently
- Uses overlapping and layered elements
- Feels more like a creative tool than enterprise software

## File Locations

All design files are located in `/home/linus/Work/norton-studios/momentum/docs/design/sonnet-v2/6/`:
- `homepage.html` - Landing page
- `registration.html` - Sign up / Sign in
- `onboarding-datasources.html` - Data source configuration
- `dashboard.html` - Organization dashboard

All files are fully functional HTML with inline CSS and pass linting validation.
