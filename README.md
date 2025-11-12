# Momentum

Momentum is a comprehensive developer productivity platform designed to provide data-driven insights into software development processes. The platform collects, aggregates, and visualizes metrics from various development tools to help organizations and individuals understand and improve their software delivery performance.

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
nvm install
nvm use
corepack enable
yarn install

# Start development environment (database + API + frontend)
yarn dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Prisma Studio: http://localhost:5555
- Database: PostgreSQL on localhost:5432

## Project Structure

```
momentum/
├── app/                      # React Router application code
│   ├── routes/              # Route components
│   │   ├── home.tsx         # Route handlers
│   │   └── home.test.tsx    # Co-located tests
│   ├── welcome/             # Feature modules
│   ├── root.tsx             # Root layout
│   ├── entry.server.tsx     # Server entry point
│   ├── entry.client.tsx     # Client entry point
│   ├── app.css              # Global styles
│   └── db.server.ts         # Prisma client singleton
├── e2e/                     # Playwright E2E tests
│   ├── journeys/            # E2E test files
│   │   └── example.spec.ts  # Journey test examples
│   └── playwright.config.ts # Playwright configuration
├── prisma/                  # Database schema and migrations
│   └── schema.prisma        # Prisma schema definition
├── public/                  # Static assets
│   └── favicon.ico
├── docs/                    # Project documentation
│   ├── OVERVIEW.md          # Project vision and goals
│   ├── TECHNICAL.md         # Technical architecture
│   ├── PRODUCT.md           # Product specification
│   ├── PIPELINES.md         # CI/CD pipelines
│   └── USER_JOURNEYS.md     # User flows and wireframes
├── .env                     # Environment variables (not committed)
├── .env.example             # Environment variables template
├── .gitignore               # Git ignore patterns
├── biome.json               # Biome linter/formatter config
├── docker-compose.yml       # PostgreSQL database setup
├── package.json             # Dependencies and scripts
├── react-router.config.ts   # React Router configuration
├── tsconfig.json            # TypeScript configuration
├── vite.config.ts           # Vite bundler configuration
├── vitest.config.ts         # Vitest test configuration
└── CLAUDE.md                # AI development guide
```

## Core Commands

### Development

```bash
# Install dependencies
yarn install

# Start PostgreSQL database
docker-compose up -d

# Push Prisma schema to database (for development)
yarn db:push

# Run database migrations (for production)
yarn db:migrate

# Open Prisma Studio (database GUI)
yarn db:studio

# Start development server with hot reload
yarn dev
# App runs on http://localhost:3000
```

### Testing

```bash
# Run unit/integration tests
yarn test

# Run tests in watch mode
yarn test:watch

# Run tests with coverage
yarn test:coverage

# Run E2E tests
yarn test:e2e
```

### Code Quality

```bash
# Run linter
yarn lint

# Run linter with auto-fix
yarn lint:fix

# Format code
yarn format

# Check code formatting
yarn format:check

# Type check
yarn typecheck
```

### Production

```bash
# Build for production
yarn build

# Start production server
yarn start
```

## Technology Stack

### Core Technologies

- **Runtime**: Node.js 24.x with TypeScript 5.9 (strict mode, ES modules only)
- **Package Manager**: Yarn 4.11 with workspaces
- **Frontend**: Remix with React 19, Vite build tool
- **Backend**: Express 5.x REST API
- **Database**: PostgreSQL 16+ with Prisma 6.x ORM
- **Testing**: Vitest (unit/integration), Playwright (E2E), Testcontainers
- **Code Quality**: Biome (linting + formatting), SonarQube (static analysis)
- **CI/CD**: GitHub Actions with caching and parallel execution

### Key Conventions

- **Database**: `snake_case` tables and fields with Prisma `@map` annotations
- **TypeScript**: `camelCase` variables, `PascalCase` classes/interfaces
- **Files**: `kebab-case` file and directory names
- **Module System**: ES modules exclusively (`import`/`export` only)
- **Dependencies**: All pinned to specific versions for consistency

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

[MIT License](LICENSE)

## Support

- Documentation: See `/docs` directory
- Issues: [GitHub Issues](https://github.com/norton-studios/momentum/issues)
- Discussions: [GitHub Discussions](https://github.com/norton-studios/momentum/discussions)