# Technical Architecture

A remix app with an Express backend, PostgreSQL database, and a cron-based data collection engine. 
## Technology Stack

### Core Technologies

#### Runtime & Language
- **Node.js 24.x**: JavaScript runtime environment
- **TypeScript 5.9**: Strict type checking, ES modules
- **Yarn 4.11**: Package management and workspace management

#### Frontend
- **Remix**: Full-stack web framework with server-side rendering
- **React 19**: UI component library
- **Vite**: Build tool and development server
- **TypeScript**: Type-safe component development

#### Backend
- **Express 5.x**: Web application framework
- **Prisma 6.x**: Next-generation ORM and database toolkit
- **PostgreSQL 16+**: Primary database
- **node-cron**: Scheduled task execution

#### Testing
- **Vitest 4**: Unit and integration testing framework
- **@vitest/coverage-v8**: Code coverage reporting
- **Playwright**: End-to-end testing framework
- **Testcontainers**: Isolated test database instances

#### Development Tools
- **Biome**: Fast formatter and linter (replaces ESLint + Prettier)
- **tsx**: TypeScript execution and REPL
- **Concurrently**: Run multiple commands in parallel
- **Docker**: Container platform for PostgreSQL

#### CI/CD
- **GitHub Actions**: Continuous integration and deployment
- **SonarQube**: Code quality and security analysis

### Module System

The entire codebase uses **ES modules exclusively**:
- All `package.json` files include `"type": "module"`
- Use `import`/`export` syntax only
- Never use CommonJS `require()`/`module.exports`
- Ensures modern JavaScript standards and better tree-shaking
