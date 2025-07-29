# Developer Productivity Metrics Specification

## Overview

This document specifies the metrics to be displayed in the Momentum developer productivity platform. Metrics are organized into three hierarchical levels: Organization, Team, and Contributor, providing insights at different granularities to support data-driven decision making.

## Navigation Structure

### Hierarchy Model
1. **Organization** → Single view showing aggregate metrics across all teams
2. **Teams** → Comparison view (default) → Individual team view
3. **Contributor** → Comparison view (default) → Individual contributor view

### Navigation Flow
```
Dashboard
├── Organization (aggregate view)
├── Teams
│   ├── All Teams Comparison (default)
│       └── Individual Team View
└── Contributors
    ├── All Contributors Comparison (default)
        └── Individual Contributor View
```

## Global Features

### Date Range Selector
- Default options: 7 days, 30 days, 60 days, 90 days
- Custom date range picker
- All metrics respect selected date range
- Comparison mode: Compare to previous period

### Interactive Charts
- Toggle individual data series on/off
- Hover for detailed values
- Click to drill down (where applicable)
- Export functionality (PNG, CSV)

## Metrics Categories

### 1. Organization Metrics

#### Security & Compliance
- **CVE Dashboard**
  - Total CVE count with trend
  - Severity distribution (Critical, High, Medium, Low)
  - Interactive stacked chart with severity toggles
  - Time to resolution metrics
  - CVE aging report

#### Delivery
- **Pipeline Stability**
  - Rolling 30-day average of master pipeline success rate
  - Trend chart with anomaly detection
  - Success/failure distribution by time of day
  
- **Delivery Velocity**
  - Number of successful master pipeline runs
  - Deployment frequency trend
  - Release cycle time

- **Commit Activity Heatmaps**
  - Time of day distribution (24-hour heatmap)
  - Day of week distribution
  - Timezone-adjusted views
  - Peak productivity identification

### 2. Team Metrics

#### Delivery Metrics
- **Merge Request Metrics**
  - Open MR count with age distribution
  - Average time to merge (first commit → merge)
  - MR throughput (MRs merged per week)
  - MR size distribution (lines changed)

- **Cycle Time Analytics**
  - MR cycle time: Creation → Merge
  - JIRA cycle time: First non-default status → Closed
  - Breakdown by stages (Review, Testing, etc.)
  - Bottleneck identification

- **Work in Progress (WIP)**
  - Active MRs count with trend
  - Active JIRA tickets (non-default, non-closed)
  - WIP limits and violations
  - Flow efficiency calculations

- **JIRA Flow Metrics**
  - Average time per column (excluding default/closed)
  - Column transition frequency
  - Blocked ticket identification
  - Ticket aging report

- **Code Review Efficiency**
  - Time to first review (MR created → first comment)
  - Review turnaround time
  - Review coverage (% MRs reviewed)
  - Reviewer workload distribution

#### Operational Metrics
- **Pipeline Performance**
  - Master pipeline failure rate
  - Average pipeline duration with trend
  - Duration breakdown by stages

- **Pipeline Failure Analysis**
  - Distribution by failing step/stage
  - Failure patterns (time-based, commit-based)
  - Top failure reasons with counts
  - Recovery time metrics

#### Quality Metrics
- **Code Health**
  - Code churn rate (additions + deletions / total lines)
  - Refactoring ratio (deletions / additions)
  - Technical debt trend
  - Code complexity trends (cyclomatic, cognitive)

- **Test Coverage**
  - Overall coverage percentage with trend
  - Coverage by component/module
  - New code coverage vs overall
  - Coverage gaps identification

- **Code Review Quality**
  - Comments per MR (average, distribution)
  - Comment resolution time
  - Review depth score (based on comments, time spent)
  - Approval patterns

- **Static Analysis**
  - SonarQube issue count by severity
  - Code smell trends
  - Security vulnerability count
  - Maintainability rating evolution

### 3. Individual Metrics

#### Contribution Metrics
- **Commit Activity**
  - Total commits with trend
  - Commit frequency (commits per day/week)
  - Commit streak tracking
  - Commit size distribution

- **Code Contribution**
  - Lines added/removed with balance
  - Net code contribution
  - Language distribution
  - Repository contribution spread

- **Merge Request Activity**
  - MRs created count and trend
  - MR success rate (merged vs closed)
  - Average MR size
  - MR iteration count
  
#### Collaboration Metrics
- **Review Performance**
  - Average time to first review (as reviewer)
  - Review comments made
  - Review thoroughness score
  - Review response time

- **Review Reception**
  - Time to address review comments
  - Comment resolution rate
  - MR iteration efficiency
  - Collaboration score

#### Productivity Patterns
- **Activity Patterns**
  - Commit time heatmap (personal productivity hours)
  - Day of week activity distribution
  - Focus time analysis (continuous coding periods)
  - Context switching frequency

## UI/UX Specifications

### Dashboard Layout
```
┌─────────────────────────────────────────┐
│ Navigation Bar                          │
│ [Organization] [Teams] [Individuals]    │
├─────────────────────────────────────────┤
│ Date Range: [7d] [30d] [60d] [90d] [📅] │
├─────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐         │
│ │ Metric Card │ │ Metric Card │         │
│ └─────────────┘ └─────────────┘         │
│ ┌─────────────────────────────┐         │
│ │   Chart/Visualization       │         │
│ └─────────────────────────────┘         │
└─────────────────────────────────────────┘
```

### Metric Card Components
- Headline number with trend indicator
- Sparkline for quick visualization
- Comparison to previous period
- Click for detailed view

### Team Comparison View
- Sortable table with key metrics
- Radar charts for multi-dimensional comparison
- Highlighting of outliers
- Export functionality

## Technical Requirements

### Data Freshness
- Real-time: Commit activity, MR status
- Hourly: Pipeline metrics, code review times
- Daily: Quality metrics, JIRA metrics
- Weekly: Trend calculations, aggregations

### Performance Targets
- Initial page load: < 2 seconds
- Metric updates: < 500ms
- Chart interactions: < 100ms
- Data export: < 5 seconds for 90 days

### Data Retention
- Raw data: 1 year
- Daily aggregations: 2 years
- Weekly/Monthly rollups: Indefinite

## Plugin Architecture & Folder Structure

### Report Plugin Organization
Each metric visualization will be implemented as a separate report plugin, organized by hierarchical level:

```
plugins/reports/
├── organization/
│   ├── cve-dashboard/
│   ├── pipeline-stability/
│   ├── delivery-velocity/
│   └── commit-activity-heatmap/
├── team/
│   ├── merge-request-metrics/
│   ├── cycle-time/
│   ├── work-in-progress/
│   ├── jira-flow/
│   ├── code-review-efficiency/
│   ├── pipeline-performance/
│   ├── pipeline-failure-analysis/
│   ├── code-health/
│   ├── test-coverage/
│   ├── code-review-quality/
│   └── static-analysis/
└── individual/
    ├── commit-activity/
    ├── code-contribution/
    ├── merge-request-activity/
    ├── review-performance/
    ├── review-reception/
    └── activity-patterns/
```

### Plugin Structure
Each report plugin follows the standard structure:
- `src/api/index.ts` - API endpoints for metric data
- `src/components/MetricCard.tsx` - React component for metric display
- `src/index.ts` - function to load the data required for the metric. This will be used by the frontend to fetch data directly and also by the `src/api/index.ts` to provide the data via the API.
- `package.json` - Plugin configuration
- `db/schema.prisma` - Any additional schema requirements. Probably used rarely, but might be useful for db views or aggregations
- Tests co-located with implementation files

## Implementation Priorities

### Phase 1 (MVP)
1. Organization: Delivery metrics, activity patterns
2. Team: Delivery metrics, basic operational metrics
3. Contributor: Contributor metrics
4. Basic date range selection
5. Simple chart interactions

### Phase 2
1. Organization: Security metrics (CVE)
2. Team: Quality metrics, advanced operational
3. Contributor: Collaboration metrics
4. Advanced filtering and comparison
5. Export functionality


## Future Considerations

### AI/ML Enhancements
- Anomaly detection for all metrics
- Predictive analytics for delivery
- Team health scoring
- Automated insights generation

### Integrations
- Slack notifications for key metrics
- JIRA/GitHub webhooks for real-time updates
- CI/CD platform integrations
- Custom data source plugins

### Gamification
- Team leaderboards (optional)
- Personal achievement tracking
- Improvement challenges
- Peer recognition system