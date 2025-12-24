# User Journeys

## Overview

This document outlines the essential user journeys in Momentum: the initial onboarding process and the structure of the organization and individual dashboards.

---

## Journey 1: Onboarding

### Goal
Set up Momentum for the first time, connecting development tools and preparing the platform for data collection.

### Actors
- **Admin User**: First user with configuration privileges, typically an engineering manager or team lead

### Preconditions
- Momentum has been deployed to infrastructure
- PostgreSQL database is running
- Application services (API, Dashboard) are accessible

---

### Step 1: Initial Setup (First-Time Only)

**Page**: Setup (`/setup`)

**Title**: "Welcome - Momentum Setup"

**Purpose**: Create the first administrator account and organization. This page is only accessible when no admin user exists in the system.

**Form Fields**:
- Organization Name
- First Name
- Last Name
- Email Address
- Password (minimum 12 characters)

**Flow**:
1. User fills in organization and personal details
2. Click "Create Admin Account"
3. System creates organization and admin user
4. User is automatically logged in
5. Redirect to `/onboarding/data-sources`

**Guard**: If an admin user already exists, visiting `/setup` redirects to `/`

---

### Step 2: Login (Returning Users)

**Page**: Login (`/login`)

**Title**: "Sign In - Momentum"

**Form Fields**:
- Email Address
- Password

**Flow**:
1. User enters email and password
2. Click "Sign In"
3. System validates credentials
4. Redirect to dashboard or onboarding (if incomplete)

---

### Step 3: Data Source Configuration

**Page**: Connect Data Sources (`/onboarding/data-sources`)

**Title**: "Connect Data Sources - Momentum"

**Progress Indicator**: Shows 4 steps - Welcome (completed), Data Sources (active), Import, Complete

**Page Header**:
- Heading: "Connect Your Tools"
- Subheading: "Momentum integrates with your existing development workflow. Connect at least one version control system to begin tracking metrics."

**Required**: At least one VCS (Version Control System) must be configured

**Data Source Sections**:

1. **Version Control** (Required badge)
   - GitHub
   - GitLab

2. **CI/CD Platforms**
   - Jenkins
   - CircleCI

3. **Code Quality**
   - SonarQube

4. **Project Management**
   - Jira (Cloud and Data Center)

#### Data Source Card Pattern

Each data source displays as a card with:
- Icon and name
- Description of what data it provides
- Status badge: "Connected" or "Not Connected"
- "Configure [Provider]" button (or "Edit [Provider] Configuration" if connected)

**Configuration Forms** (expand when clicking Configure):

Provider-specific form fields:

**GitHub**:
- Personal Access Token (required)
- Organization Name (required)

**GitLab**:
- Personal Access Token (required)
- Host URL (optional, defaults to gitlab.com)

**Jenkins**:
- Jenkins URL (required)
- API Token (required)

**CircleCI**:
- API Token (required)

**SonarQube**:
- SonarQube URL (required)
- API Token (required)

**Jira Cloud**:
- Jira Domain (required, e.g., "mycompany.atlassian.net")
- Email Address (required)
- API Token (required)

**Jira Data Center**:
- Server URL (required)
- Personal Access Token (required)

```
┌─────────────────────────────────────────────────┐
│ [Provider-specific fields]                      │
│                                                 │
│ [Test Connection]  [Save Configuration]  [Cancel]│
└─────────────────────────────────────────────────┘
```

**Connection Validation**:
1. User fills in required fields
2. Click "Test Connection"
3. System validates credentials and access
4. Display result:
   - Success: "Connection successful!" message
   - Error: Specific error message

**Save**:
1. After successful test, click "Save Configuration"
2. Configuration stored in database
3. Card updates to show "Connected" status
4. For VCS providers: Repositories section appears below the card
5. For Jira: Projects section appears below the card

#### Repository Selection (VCS Providers)

After connecting GitHub or GitLab, a collapsible "Repositories" section appears within the data source card:

```
┌─────────────────────────────────────────────────┐
│ ▼ Repositories                    X of Y enabled│
├─────────────────────────────────────────────────┤
│ [Search repositories...]                        │
│ [Select All] [Deselect All]                     │
├─────────────────────────────────────────────────┤
│ ☑ api-service        TypeScript  Private  ★ 12 │
│ ☑ frontend-web       TypeScript  Private  ★ 8  │
│ ☐ legacy-app         JavaScript           ★ 2  │
│ ☑ shared-lib         TypeScript  Private       │
└─────────────────────────────────────────────────┘
```

**Repository Row Details**:
- Checkbox for enabling/disabling tracking
- Repository name
- Language badge (if available)
- "Private" badge (if private)
- Star count (if > 0)
- Last active timestamp

**Pre-selection Logic**:
- Repositories with recent activity are pre-selected
- User can override any selection

#### Project Selection (Jira)

After connecting Jira, a collapsible "Projects" section appears within the data source card:

```
┌─────────────────────────────────────────────────┐
│ ▼ Projects                        X of Y enabled│
├─────────────────────────────────────────────────┤
│ [Search by name or key...]                      │
│ [Select All] [Deselect All]                     │
├─────────────────────────────────────────────────┤
│ ☑ Platform Team (PLAT)                          │
│ ☑ API Development (API)                         │
│ ☐ Legacy Support (LEG)                          │
└─────────────────────────────────────────────────┘
```

**Bottom Actions**:
- Connection summary: "1 of 1 required connection established"
- "Skip for now" link → `/dashboard`
- "Continue to Import" button (enabled when at least one VCS connected)

---

### Step 4: Data Import

**Page**: Import Data (`/onboarding/importing`)

**Progress Indicator**: Shows step 3 (Import) as active

**Page Header** (changes based on state):
- Before import: "Start Import" / "Start the import process to collect data from your connected sources."
- During/after import: "Import in Progress" / "Background jobs are collecting your data. You can continue to the dashboard while this runs."

**Summary Cards**:
```
┌──────────────┬──────────────┬──────────────┐
│ Repositories │    Days      │   Sources    │
│     50       │     90       │      2       │
│   Selected   │   History    │  Connected   │
└──────────────┴──────────────┴──────────────┘
```

**Task Cards** (one per data source):
Each data source shows a card with:
- Provider name and overall status badge (Pending/Running/Complete/Partial)
- List of import tasks with status:

```
┌─────────────────────────────────────────────────┐
│ GitHub                              [Complete]  │
├─────────────────────────────────────────────────┤
│ ✓ Repository metadata        150 records [Complete]   │
│ ✓ Contributors               45 records  [Complete]   │
│ ↻ Commit history             1,234 records [In Progress] │
│ ○ Pull requests              -           [Queued]     │
└─────────────────────────────────────────────────┘
```

**Task Status Icons**:
- ✓ Completed (checkmark)
- ↻ Running (spinning)
- ✕ Failed (X)
- ○ Pending (circle)

**Import Tasks** (varies by provider):
- Repository metadata
- Contributors
- Commit history
- Pull requests
- Projects
- Issues
- CI/CD Pipelines
- Pipeline runs

**Actions**:
- "Start Import" button (shown before import starts)
- Note: "You can safely continue to the dashboard — the import will run in the background and data will appear as it becomes available."

**Bottom Actions**:
- Progress summary: "X tasks running, Y of Z completed"
- "Back to Data Sources" link → `/onboarding/data-sources`
- "Continue to Dashboard" button → `/onboarding/complete`

**Polling**: Page polls for import status updates every 3 seconds while import is running

---

### Step 5: Onboarding Complete

**Page**: Complete (`/onboarding/complete`)

**Content**:
```
┌─────────────────────────────────────────────────┐
│                      🎉                          │
│                                                 │
│             You're All Set!                     │
│                                                 │
│ Momentum is now collecting data from your       │
│ development tools.                              │
│                                                 │
│ Connected Data Sources:                         │
│  • GitHub (my-organization)                     │
│  • GitLab (gitlab.company.com)                  │
│                                                 │
│ Data Collection Summary:                        │
│ ┌─────────┬─────────┬─────────┬─────────┐      │
│ │ 📦 50   │ 💾 1,234│ 🔀 120  │ 👥 20   │      │
│ │ repos   │ commits │ PRs     │ contrib.│      │
│ │ tracked │ imported│ imported│ found   │      │
│ └─────────┴─────────┴─────────┴─────────┘      │
│                                                 │
│ Next Steps:                                     │
│  → Explore your organization metrics            │
│  → View individual contributor metrics          │
│  → Configure additional data sources            │
│  → Invite team members                          │
│                                                 │
│           [Go to Dashboard]                     │
└─────────────────────────────────────────────────┘
```

**Navigation**:
- "Go to Dashboard" button → `/dashboard`

**Post-Onboarding**:
- Background data collection continues automatically
- Incremental updates occur on configured schedule

---

## Organization Dashboard

### Overview

The Organization Dashboard provides high-level metrics across all repositories, teams, and contributors. It's designed for engineering managers and team leads to understand overall productivity trends and identify areas for improvement.

**URL**: `/dashboard` (default)

---

### Example Page Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ Momentum                    Organization ▼   Individual   ⚙️  👤 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Organization > Overview                                         │
│                                                                 │
│ Date Range: [7d] [30d] [60d] [90d] [Custom ▼]  📥 Export       │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                         OVERVIEW CARDS                          │
├─────────────────────────────────────────────────────────────────┤
│ ┌──────────────┬──────────────┬──────────────┬──────────────┐  │
│ │ Repositories │ Contributors │ Commits      │ Pull Requests│  │
│ │     50       │     23       │   1,247      │     156      │  │
│ │              │              │  ↑ 12%       │  ↓ 8%        │  │
│ └──────────────┴──────────────┴──────────────┴──────────────┘  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                       PRIMARY METRICS                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Delivery                                                        │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ GitHub Velocity                              [View All] │ │
│ │                                                             │ │
│ │ Deployments This Week: 12 (↑ 33%)                          │ │
│ │ Average Cycle Time: 2.1 days (↓ 0.3)                       │ │
│ │                                                             │ │
│ │ [Bar Chart: Deployments per week]                          │ │
│ │                                                             │ │
│ │ Lead Time: 3.5 days  |  Time to Merge: 18 hours           │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ JIRA Velocity                             [View All] │ │
│ │                                                             │ │
│ │ Tickets This Week: 287 (↑ 12%)                             │ │
│ │                                                             │ │
│ │                                                             │ │
│ │ [Line Chart: JIRAs closed       ]                           │ │
│ │                                                             │ │
│ │ Avg Time to Merge: 18.2 hours                              │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Work In Progress                                 [View All] │ │
│ │                                                             │ │
│ │ Open PRs: 23  |  Waiting for Review: 12  |  In Review: 11 │ │
│ │                                                             │ │
│ │ [Bar Chart: WIP by status]                                 │ │
│ │                                                             │ │
│ │ Oldest PR: 5 days  |  Avg Age: 1.8 days                   │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Operational                                                     │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Pipeline Success Rate                            [View All] │ │
│ │                                                             │ │
│ │ 30-Day Average: 94.5% (↑ 2.3%)                             │ │
│ │                                                             │ │
│ │ [Line Chart: Success rate over time]                       │ │
│ │                                                             │ │
│ │ Recent Failures:                                            │ │
│ │  • api-service: Unit tests failed (2 hours ago)            │ │
│ │  • frontend-web: Build timeout (5 hours ago)               │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Pipeline Duration                                [View All] │ │
│ │                                                             │ │
│ │ Average Duration: 12.5 minutes (↓ 1.2 min)                │ │
│ │                                                             │ │
│ │ [Stacked Bar: Duration by stage]                           │ │
│ │                                                             │ │
│ │ Build: 8 min | Test: 3 min | Deploy: 1.5 min              │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Infrastructure Costs                             [View All] │ │
│ │                                                             │ │
│ │ This Month: $12,450 (↑ 5%)                                 │ │
│ │ Budget: $15,000  |  Remaining: $2,550                      │ │
│ │                                                             │ │
│ │ [Pie Chart: Cost breakdown by service]                     │ │
│ │                                                             │ │
│ │ Top Costs: Compute (45%) | Storage (30%) | Network (15%) │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Quality                                                         │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Code Coverage                                    [View All] │ │
│ │                                                             │ │
│ │ Overall Coverage: 78% (↑ 2%)                               │ │
│ │ New Code Coverage: 85%                                     │ │
│ │                                                             │ │
│ │ [Line Chart: Coverage trend over time]                     │ │
│ │                                                             │ │
│ │ Target: 80%  |  Gap: 2%                                    │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Code Quality Metrics                             [View All] │ │
│ │                                                             │ │
│ │ Code Smells: 127 (↓ 15)                                    │ │
│ │ Technical Debt: 12.5 days (↓ 2 days)                      │ │
│ │ Maintainability: A                                         │ │
│ │                                                             │ │
│ │ [Line Chart: Technical debt trend]                         │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Security Vulnerabilities                         [View All] │ │
│ │                                                             │ │
│ │ Total Vulnerabilities: 23 (↓ 5)                            │ │
│ │                                                             │ │
│ │ Critical: 2  ████                                           │ │
│ │ High:     8  ████████████                                   │ │
│ │ Medium:  10  ███████████████                                │ │
│ │ Low:      3  ████                                           │ │
│ │                                                             │ │
│ │ [Trend Chart: Last 90 days]                                │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Navigation Structure

**Top Navigation Bar**:
- **Organization**: Organisation wide and team metrics
- **Individual**: Link to individual metrics view
- **Settings (⚙️)**: Configuration and data sources
- **Profile (👤)**: User account and logout

---

### Metric Cards

Each metric card follows a consistent pattern:

**Card Structure**:
```
┌─────────────────────────────────────────────────┐
│ Metric Name                         [View All]  │ ← Title and expand link
├─────────────────────────────────────────────────┤
│                                                 │
│ Primary Value: 94.5% (↑ 2.3%)                  │ ← Headline metric with trend
│                                                 │
│ [Visualization: Chart/Graph]                   │ ← Visual representation
│                                                 │
│ Key Insight or Recent Event                    │ ← Contextual information
│                                                 │
└─────────────────────────────────────────────────┘
```

**Interactive Elements**:
- **[View All]**: Expands to detailed view with more data points
- **Hover**: Shows tooltip with exact values
- **Click chart**: Drills down to specific time period or data point
- **Legend**: Toggle data series on/off

---

### Security Metrics

#### CVE Dashboard

**Primary Metric**: Total vulnerability count with severity breakdown

**Visualization**: Stacked bar chart showing severity distribution over time

**Data Displayed**:
- Total CVE count (current)
- Change from previous period
- Breakdown by severity (Critical, High, Medium, Low)
- Trend line (last 90 days)
- Average time to resolution
- Oldest unresolved vulnerabilities

**Actions**:
- Click to view detailed vulnerability list
- Filter by severity
- Export vulnerability report
- Link to affected repositories

---

### Delivery Metrics

#### Delivery Velocity

Work in progress:
  - bar chart showing for each day: total JIRA tickets in an in progress status
  - bar chart showing for each day: total number of GitHub/GitLab PRs/MRs


**Primary Metric**: Deployment frequency (deployments per week)

**Visualization**: Bar chart showing deployment counts over time

**Data Displayed**:
- Current week deployment count
- Change from previous period
- Average cycle time (commit to production)
- Lead time for changes
- Deployment success rate

**Actions**:
- Click to view deployment history
- Filter by environment
- View deployment details
- Export deployment report

---

### Operational Metrics

#### Pipeline Stability

**Primary Metric**: 30-day rolling average success rate

**Visualization**: Line chart showing success rate over time

**Data Displayed**:
- Current success rate percentage
- Change from previous period
- Success/failure counts
- Recent failures with timestamps
- Failure patterns (by time of day, day of week)

**Actions**:
- Click to view detailed build history
- Filter by repository or branch
- View failure logs
- Identify problematic pipelines


---

### Activity Metrics

#### Commit Activity Heatmap

**Primary Metric**: Total commits with temporal distribution

**Visualization**: 24x7 heatmap (hours × days of week)

**Data Displayed**:
- Total commit count for selected period
- Peak activity hours
- Day-of-week distribution
- Timezone-adjusted view (if configured)
- Identification of unusual patterns

**Actions**:
- Click cell to view commits in that time slot
- Adjust timezone for visualization
- Export heatmap data
- Compare across time periods

---

### Empty States

**No Data Available**:
```
┌─────────────────────────────────────────────────┐
│ CVE Dashboard                                   │
├─────────────────────────────────────────────────┤
│                                                 │
│               [Security Icon]                   │
│                                                 │
│     No vulnerability data available yet         │
│                                                 │
│ Configure a security scanning tool to see      │
│ CVE metrics here.                              │
│                                                 │
│          [Configure Data Sources]               │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

### Export Options

**Export Menu** (📥 Export button):
- **PNG**: Download current view as image
- **CSV**: Export raw data for selected metrics
- **PDF**: Generate formatted report
- **JSON**: Export data for external processing

**Date Range Selector**:
- Preset ranges: 7d, 30d, 60d, 90d
- Custom range picker
- Compare to previous period option

---

## Individual Dashboard

### Overview

The Individual Dashboard provides personal productivity metrics for each contributor. It's designed to help developers understand their own work patterns, contributions, and collaboration effectiveness.

**URL**: `/dashboard/individual` 

**Access Control**:
- Users can view their own metrics by default
- Managers can view team member metrics (if permissions configured)
- Contributors can opt-in to sharing metrics with team

---

### Page Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ Momentum            Organization   Individual ▼        ⚙️  👤    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Individual > Alice Johnson > Overview                           │
│                                                                 │
│ Date Range: [7d] [30d] [60d] [90d] [Custom ▼]  📥 Export       │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                         OVERVIEW CARDS                          │
├─────────────────────────────────────────────────────────────────┤
│ ┌───────────────┬───────────────┬───────────────┬─────────────┐ │
│ │ Commits       │ Pull Requests │ Code Reviews  │ Streak      │ │
│ │    87         │     12        │      24       │   12 days   │ │
│ │  ↑ 12%        │  ↑ 20%        │  ↓ 8%         │             │ │
│ └───────────────┴───────────────┴───────────────┴─────────────┘ │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                       PRIMARY METRICS                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Contribution Metrics                                            │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Commit Activity                                  [View All] │ │
│ │                                                             │ │
│ │ Last 30 Days: 87 commits (↑ 12%)                           │ │
│ │ Daily Average: 4.35 commits                                │ │
│ │ Current Streak: 12 days 🔥                                 │ │
│ │                                                             │ │
│ │ [Line Chart: Commit frequency over time]                   │ │
│ │                                                             │ │
│ │ [Contribution Calendar Grid]                               │ │
│ │ Mon ███▓▓▓▓█▓                                              │ │
│ │ Tue ▓▓█▓▓                                                  │ │
│ │ Wed ███▓▓▓▓                                                │ │
│ │ Thu ▓▓▓█▓                                                  │ │
│ │ Fri ▓█▓▓█                                                  │ │
│ │                                                             │ │
│ │ Commit Size Distribution:                                  │ │
│ │  Small (1-50 lines):    45 (52%)                           │ │
│ │  Medium (51-200 lines): 32 (37%)                           │ │
│ │  Large (201+ lines):    10 (11%)                           │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Code Contribution                                [View All] │ │
│ │                                                             │ │
│ │ Lines Added:     +2,456                                    │ │
│ │ Lines Removed:   -1,234                                    │ │
│ │ Net:            +1,222                                     │ │
│ │ Refactoring Ratio: 50.2%                                   │ │
│ │                                                             │ │
│ │ [Stacked Area Chart: Additions vs Deletions]               │ │
│ │                                                             │ │
│ │ Language Distribution:                                     │ │
│ │  TypeScript: 45% ████████████████████                      │ │
│ │  Python:     30% █████████████                             │ │
│ │  JavaScript: 15% ███████                                   │ │
│ │  Other:      10% ████                                      │ │
│ │                                                             │ │
│ │ Repository Spread:                                         │ │
│ │  api-service:    40% (35 commits)                          │ │
│ │  frontend-web:   35% (30 commits)                          │ │
│ │  shared-lib:     15% (13 commits)                          │ │
│ │  docs:           10% (9 commits)                           │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Pull Request Activity                            [View All] │ │
│ │                                                             │ │
│ │ Created: 12 (↑ 20%)                                        │ │
│ │ Merged:  10 (83% success rate)                             │ │
│ │ Closed:   2 (without merge)                                │ │
│ │                                                             │ │
│ │ Average MR Size: 156 lines                                 │ │
│ │ Average Iterations: 2.3                                    │ │
│ │                                                             │ │
│ │ [Bar Chart: PRs created/merged over time]                  │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Collaboration Metrics                                           │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Review Performance                               [View All] │ │
│ │                                                             │ │
│ │ Reviews Completed: 24                                      │ │
│ │ Average Time to Review: 4.2 hours                          │ │
│ │ Comments Made: 156                                         │ │
│ │ Thoroughness Score: 8.2/10                                 │ │
│ │                                                             │ │
│ │ [Line Chart: Review response time over time]               │ │
│ │ Target: < 8 hours ✓ (Achieved 92% of the time)            │ │
│ │                                                             │ │
│ │ Comment Types:                                             │ │
│ │  Suggestions:     45% (Improvements)                       │ │
│ │  Questions:       30% (Clarification)                      │ │
│ │  Nitpicks:        15% (Style/formatting)                   │ │
│ │  Blocking Issues: 10% (Must fix)                           │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Review Reception                                 [View All] │ │
│ │                                                             │ │
│ │ Average Time to Address Comments: 6.3 hours                │ │
│ │ Comment Resolution Rate: 95%                               │ │
│ │ MR Iteration Efficiency: 2.3 rounds                        │ │
│ │                                                             │ │
│ │ [Bar Chart: Response times to review comments]             │ │
│ │                                                             │ │
│ │ Collaboration Score: 8.5/10                                │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Productivity Patterns                                           │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Activity Patterns                                [View All] │ │
│ │                                                             │ │
│ │ Personal Productivity Hours                                │ │
│ │                                                             │ │
│ │ Hour   Mon  Tue  Wed  Thu  Fri  Sat  Sun                   │ │
│ │ 08:00  ░    ▒    ▒    ▒    ░    ░    ░                      │ │
│ │ 09:00  ▓    ▓    ▓    ▓    ▓    ░    ░                      │ │
│ │ 10:00  █    █    █    █    ▓    ░    ░                      │ │
│ │ 11:00  ▓    █    █    ▓    ▓    ░    ░                      │ │
│ │ 12:00  ▒    ▒    ▓    ▒    ▒    ░    ░                      │ │
│ │ 14:00  ▓    ▓    ▓    ▓    ▓    ░    ░                      │ │
│ │ 15:00  ▓    ▓    ▓    ▓    ▓    ░    ░                      │ │
│ │ 16:00  ▓    ▓    ▓    ▓    ░    ░    ░                      │ │
│ │                                                             │ │
│ │ Peak Hours: 9-11 AM (most productive)                      │ │
│ │                                                             │ │
│ │ Focus Time Analysis:                                       │ │
│ │  Continuous coding periods (> 2 hours)                     │ │
│ │  This week: 8 sessions (24 hours total)                   │ │
│ │  Average session: 3 hours                                  │ │
│ │  Longest: 5.5 hours                                        │ │
│ │                                                             │ │
│ │ Context Switching:                                         │ │
│ │  Average: 4.2 switches/day (↓ from 5.8)                   │ │
│ │  Optimal: < 5 switches/day ✓                              │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Navigation Structure

**Top Navigation Bar**:
- **Organization**: Link to organization metrics view
- **Individual ▼**: Dropdown to switch contributors (if permissions allow)
  - My Metrics (current user)
  - [List of team members if manager]
- **Settings (⚙️)**: Personal preferences
- **Profile (👤)**: User account

**Metric Categories** (left sidebar or tabbed navigation):
1. **Overview**: Summary of all personal metrics
2. **Contributions**: Commits, code changes, PRs
3. **Collaboration**: Code reviews given and received
4. **Patterns**: Work habits and productivity rhythms

---

### Contribution Metrics

#### Commit Activity

**Primary Metrics**:
- Total commits in selected period
- Daily average
- Current streak (consecutive days with commits)

**Visualizations**:
- Line chart: Commit frequency over time
- Contribution calendar: GitHub-style grid showing daily activity
- Histogram: Commit size distribution

**Insights**:
- Consistency score based on regularity
- Comparison to team average (optional)
- Identification of gaps (vacations, etc.)

#### Code Contribution

**Primary Metrics**:
- Lines added/removed
- Net contribution
- Refactoring ratio (deletions / additions)

**Visualizations**:
- Stacked area chart: Additions vs deletions over time
- Pie chart: Language distribution
- Bar chart: Repository contribution spread

**Insights**:
- Code growth vs maintenance balance
- Primary languages and repositories
- Contribution diversity

#### Pull Request Activity

**Primary Metrics**:
- PRs created
- PRs merged (success rate)
- Average PR size
- Average iteration count

**Visualizations**:
- Bar chart: PRs created and merged over time
- Histogram: PR size distribution

**Insights**:
- PR quality indicators
- Merge success trends
- Size optimization recommendations

---

### Collaboration Metrics

#### Review Performance (as Reviewer)

**Primary Metrics**:
- Reviews completed
- Average time to first review
- Comments made
- Thoroughness score

**Visualizations**:
- Line chart: Review response times
- Scatter plot: Review time vs PR size
- Bar chart: Comment type distribution

**Insights**:
- Responsiveness vs target SLA
- Review quality vs quantity balance
- Patterns in review thoroughness

#### Review Reception (as Author)

**Primary Metrics**:
- Average time to address comments
- Comment resolution rate
- MR iteration efficiency

**Visualizations**:
- Bar chart: Response times over time
- Line chart: Iteration count trend

**Insights**:
- Collaboration effectiveness
- Code quality trends
- Communication efficiency

---

### Productivity Patterns

#### Activity Patterns

**Primary Metrics**:
- Personal heatmap of commit activity
- Peak productivity hours
- Focus time sessions
- Context switching frequency

**Visualizations**:
- 24x7 heatmap: Personal commit patterns
- Bar chart: Focus session duration
- Line chart: Daily context switches

**Insights**:
- Optimal working hours identified
- Deep work vs fragmented time
- Work-life balance indicators
- Suggestions for schedule optimization

---

### Privacy and Sharing

**Default Privacy**:
- Users see their own metrics by default
- Metrics not visible to others unless explicitly shared

**Sharing Options**:
- Share with manager
- Share with team (anonymized or identified)
- Opt-in to leaderboards (if enabled)

**Privacy Controls** (Settings > Privacy):
- Visibility: Private / Team / Organization
- Anonymize in comparisons
- Hide specific metrics
- Disable activity tracking

---

### Empty States

**Insufficient Data**:
```
┌─────────────────────────────────────────────────┐
│ Commit Activity                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│               [Activity Icon]                   │
│                                                 │
│     Not enough data yet                        │
│                                                 │
│ You need at least 7 days of activity to see    │
│ meaningful trends.                             │
│                                                 │
│ Days with activity: 3 / 7                      │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

### Personal Goals (Future Enhancement)

**Goal Setting**:
- Set personal targets (e.g., "Complete 30 reviews this month")
- Track progress toward goals
- Celebrate milestones
- Compare to historical performance

---

## Common UI Patterns

### Date Range Selector
Appears on all metric pages, allows filtering by time period.

### Export Functionality
Available on all metrics:
- PNG: Chart images
- CSV: Raw data
- JSON: Structured data

### Interactive Charts
- Hover for tooltips
- Click to drill down
- Toggle series on/off
- Zoom and pan

### Help and Documentation
- **?** icon next to metrics for definitions
- Contextual help tooltips
- Link to documentation

### Responsive Design
- Desktop: Full layout with sidebar
- Tablet: Simplified layout, collapsible sidebar
- Mobile: Single column, stacked cards

---

## Conclusion

The onboarding journey and dashboard designs prioritize:
- **Simplicity**: Clear, focused views with progressive disclosure
- **Actionability**: Metrics that drive decisions and improvements
- **Privacy**: Individual control over metric visibility
- **Context**: Trends and comparisons for meaningful insights

These user journeys provide the foundation for a productivity platform that helps teams and individuals understand and improve their software delivery performance.
