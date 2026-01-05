import { PrismaPg } from "@prisma/adapter-pg";
import { type Prisma, PrismaClient } from "../prisma/client/client.ts";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

export const db = new PrismaClient({
  adapter,
  log: process.env.DB_LOG ? ["query", "error", "warn"] : ["error"],
});

export type DbClient = PrismaClient | Prisma.TransactionClient;

export { type Prisma, PrismaClient };

// Re-export types that are commonly used
export type {
  DataSource,
  DataSourceConfig,
  ImportBatch,
  IssuePriority,
  IssueStatus,
  IssueType,
  PipelineStatus,
  PullRequestState,
  ReviewState,
  VulnerabilitySeverity,
  VulnerabilityStatus,
} from "../prisma/client/client.ts";
