# Database

This directory contains the local development database setup for the project.

## Running the Database

To start the local PostgreSQL database, run the following command from the root of the project:

```bash
npm run dev
```

This will start a PostgreSQL container using Docker Compose. The database will be available on `localhost:5432`.

## Migrations

The project uses a modular schema approach, with each resource defining its own `schema.prisma` file. To manage migrations, we have a script that synthesises these files into a single schema before running the migration.

To run the migrations, use the following command from the root of the project:

```bash
npm run migrate --workspace=database
```

This will:

1.  Run the `synthesise.ts` script to merge all `schema.prisma` files into `database/build/schema.prisma`.
2.  Run `prisma migrate dev` using the synthesised schema.
