-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'VIEWER');

-- AlterTable: Add new role column with default value
ALTER TABLE "user" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'VIEWER';

-- Update existing data: Convert is_admin boolean to role enum
UPDATE "user" SET "role" = 'ADMIN' WHERE "is_admin" = true;
UPDATE "user" SET "role" = 'VIEWER' WHERE "is_admin" = false;

-- DropColumn: Remove old is_admin column
ALTER TABLE "user" DROP COLUMN "is_admin";