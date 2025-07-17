# Momentum

A modular, extensible web application for measuring developer productivity with support for multi-tenant SaaS and self-hosted deployments.

## Features

- **Plugin-based system** for resources, data sources, and reports
- **Extensible integrations** with GitHub, GitLab, Jira, and more
- **Real-time metrics** and customizable reporting
- **Self-hosted or SaaS** deployment options

## Quick Start

```bash
# Clone the repository
git clone https://github.com/norton-studios/momentum.git
cd momentum

# Install dependencies
yarn install

# Copy environment files
cp apps/database/.env.example apps/database/.env
cp apps/api/.env.example apps/api/.env
cp apps/frontend/.env.example apps/frontend/.env

# Start development environment (database + API + frontend)
yarn dev
```

The application will be available at:
- Frontend: http://localhost:3000
- API: http://localhost:3001
- Database: PostgreSQL on localhost:5432

## Project Structure

```
momentum/
├── apps/              # Core applications
│   ├── api/           # Express API server
│   ├── frontend/      # Remix web application
│   ├── crons/         # Scheduled job processor
│   └── database/      # Prisma schema management
├── plugins/           # Extensible modules
│   ├── resources/     # Data models (team, repository, etc.)
│   ├── data-sources/  # External integrations (GitHub, etc.)
│   └── reports/       # Analytics and insights
├── documentation/     # Architecture docs and ADRs
└── e2e-tests/         # End-to-end test suite
```

## Core Commands

```bash
# Development
yarn dev              # Start all services
yarn start:db         # Start PostgreSQL only
yarn start:api        # Start API server only
yarn start:frontend   # Start frontend only

# Testing
yarn test             # Run all tests
yarn test:ui          # Run tests with UI

# Code Quality
yarn lint             # Run linter
yarn format           # Format code
yarn sonar            # Run SonarQube analysis (local)

# Database
yarn workspace @mmtm/database run synthesise  # Combine schemas
yarn workspace @mmtm/database run generate    # Generate client
yarn workspace @mmtm/database run migrate     # Run migrations
```

## Architecture Overview

### Plugin System

The application uses a dynamic plugin architecture:

- **Resources**: Define data models and API endpoints
- **Data Sources**: Collect data from external systems
- **Reports**: Generate insights and analytics

Plugins are automatically discovered and loaded at runtime.

### Multi-Tenancy

- Single database with tenant isolation via `tenant_id`
- Automatic tenant filtering in all queries
- Secure data isolation between organizations

### Technology Stack

- **Frontend**: Remix, React, TypeScript, Tailwind CSS
- **Backend**: Express 5, TypeScript, Prisma
- **Database**: PostgreSQL
- **Testing**: Vitest, Playwright
- **Tooling**: Biome, Yarn Workspaces
- **Code Quality**: SonarQube for static analysis and quality gates

## Development Guide

### Adding a New Resource

```bash
# Create plugin structure
mkdir -p plugins/resources/my-resource/{api,db}

# Add schema in db/schema.prisma
# Add API routes in api/index.ts
# Run yarn dev to regenerate
```

### Adding a Data Source

```typescript
// plugins/data-sources/my-source/index.ts
export const provides: string[] = ["repository"];
export const dependencies: string[] = ["team"]; // optional
export const importWindowDuration = 86400 * 1000; // optional, defaults to 24h

// Main execution function
export async function run(
  env: Record<string, string>,
  db: PrismaClient,
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<void> {
  // Data collection logic
}
```

### Environment Variables

Key environment variables:

- `DATABASE_URL`: PostgreSQL connection string
- `GITHUB_TOKEN`: For GitHub integration (optional)
- `SONAR_TOKEN`: SonarQube authentication token (for CI/CD)
- `SONAR_HOST_URL`: SonarQube server URL (for CI/CD)

### SonarQube Setup

For local SonarQube analysis, install the SonarQube scanner:

```bash
# Install SonarQube scanner (requires Java)
npm install -g sonar-scanner

# Run local analysis (requires SonarQube server)
yarn sonar
```

The project is configured with `sonar-project.properties` for multi-module analysis. Quality gates run automatically on all pull requests.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Ensure SonarQube quality gates pass
6. Submit a pull request

## License

[MIT License](LICENSE)

## Support

- Documentation: See `/documentation` directory
- Issues: [GitHub Issues](https://github.com/norton-studios/momentum/issues)
- Discussions: [GitHub Discussions](https://github.com/norton-studios/momentum/discussions)