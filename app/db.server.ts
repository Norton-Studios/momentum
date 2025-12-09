import { PrismaClient } from '../prisma/client/client.ts';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ 
  connectionString: process.env.DATABASE_URL 
});

const db = new PrismaClient({ 
  adapter,
  log: process.env.DB_LOG ? ["query", "error", "warn"] : ["error"],
});

export type DbClient = PrismaClient | Prisma.TransactionClient;
