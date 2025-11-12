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
...
```

## Core Commands

```bash
# Development
yarn dev              # Start all services
yarn start            # Start app only

# Testing
yarn test             # Run unit tests
yarn test:e2e         # Run end-to-end tests

# Code Quality
yarn lint             # Run linter
yarn format           # Format code
```

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