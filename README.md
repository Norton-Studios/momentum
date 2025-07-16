# Momentum

A modular, extensible web application for measuring developer productivity with support for multi-tenant SaaS and self-hosted deployments.

## Features

- **Multi-tenant architecture** with isolated data per tenant
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
├── apps/               # Core applications
│   ├── api/           # Express API server
│   ├── frontend/      # Remix web application
│   ├── crons/         # Scheduled job processor
│   └── database/      # Prisma schema management
├── plugins/           # Extensible modules
│   ├── resources/     # Data models (team, repository, etc.)
│   ├── data-sources/  # External integrations (GitHub, etc.)
│   └── reports/       # Analytics and insights
├── documentation/     # Architecture docs and ADRs
└── e2e-tests/        # End-to-end test suite
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
export const resources = ['repository', 'commit']
export const run = async (db: PrismaClient) => {
  // Collection logic
}
```

### Environment Variables

Key environment variables:

- `DATABASE_URL`: PostgreSQL connection string
- `GITHUB_TOKEN`: For GitHub integration (optional)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

[MIT License](LICENSE)

## Support

- Documentation: See `/documentation` directory
- Issues: [GitHub Issues](https://github.com/norton-studios/momentum/issues)
- Discussions: [GitHub Discussions](https://github.com/norton-studios/momentum/discussions)