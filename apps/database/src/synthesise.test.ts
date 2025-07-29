import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";

// Mock dependencies
vi.mock("fast-glob");
vi.mock("node:fs/promises");
vi.mock("node:path");

const mockFg = vi.mocked(fg);
const mockFs = vi.mocked(fs);
const mockPath = vi.mocked(path);

// Synthesise function extracted for testing
async function synthesise() {
  const baseSchemaPath = path.join(__dirname, "../prisma/schema.prisma");
  const baseSchema = await fs.readFile(baseSchemaPath, "utf-8");

  const resourcesDir = path.join(__dirname, "../../../plugins/resources");
  const schemaPaths = await fg("**/db/schema.prisma", {
    cwd: resourcesDir,
    absolute: true,
  });

  let combinedSchema = baseSchema;
  const definedModels = new Set<string>();

  for (const schemaPath of schemaPaths) {
    const schemaContent = await fs.readFile(schemaPath, "utf-8");
    const modelDefinitions = schemaContent.match(/(^(model|enum|type)[\s\S]*?^})/gm);

    if (modelDefinitions) {
      for (const model of modelDefinitions) {
        const modelNameMatch = model.match(/^(?:model|enum|type)\s+(\w+)/);
        if (modelNameMatch && !definedModels.has(modelNameMatch[1])) {
          combinedSchema += `\n${model}`;
          definedModels.add(modelNameMatch[1]);
        }
      }
    }
  }

  const buildDir = path.join(__dirname, "../build");
  await fs.mkdir(buildDir, { recursive: true });
  await fs.writeFile(path.join(buildDir, "schema.prisma"), combinedSchema);

  console.log("Prisma schema synthesised successfully!");
}

describe("Schema Synthesis", () => {
  // Mock implementations
  let mockJoin: ReturnType<typeof vi.fn>;
  let mockReadFile: ReturnType<typeof vi.fn>;
  let mockWriteFile: ReturnType<typeof vi.fn>;
  let mockMkdir: ReturnType<typeof vi.fn>;
  let mockConsoleLog: ReturnType<typeof vi.fn>;
  let mockConsoleError: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock path.join
    mockJoin = vi.fn();
    mockPath.join = mockJoin;

    // Mock fs operations
    mockReadFile = vi.fn();
    mockWriteFile = vi.fn();
    mockMkdir = vi.fn();
    mockFs.readFile = mockReadFile;
    mockFs.writeFile = mockWriteFile;
    mockFs.mkdir = mockMkdir;

    // Mock console methods
    mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
    mockConsoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    // Default path.join behavior
    mockJoin.mockImplementation((...args) => args.join("/"));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const baseSchema = `// This is your main Prisma schema file
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["multiSchema"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  schemas  = ["core", "scm"]
}
`;

  const createMockSchema = (models: string[]) => {
    return models
      .map(
        (model) => `model ${model} {
  id Int @id @default(autoincrement())
  name String
  
  @@map("${model.toLowerCase()}")
  @@schema("core")
}`,
      )
      .join("\n\n");
  };

  it("should successfully combine base schema with plugin schemas", async () => {
    const pluginSchemas = ["User", "Team", "Repository"];

    // Setup mocks
    mockReadFile
      .mockResolvedValueOnce(baseSchema) // Base schema
      .mockResolvedValueOnce(createMockSchema(["User"])) // Plugin 1
      .mockResolvedValueOnce(createMockSchema(["Team"])) // Plugin 2
      .mockResolvedValueOnce(createMockSchema(["Repository"])); // Plugin 3

    mockFg.mockResolvedValue(["/path/to/user/db/schema.prisma", "/path/to/team/db/schema.prisma", "/path/to/repository/db/schema.prisma"]);

    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);

    await synthesise();

    // Verify file operations
    expect(mockReadFile).toHaveBeenCalledWith(expect.stringContaining("prisma/schema.prisma"), "utf-8");
    expect(mockFg).toHaveBeenCalledWith("**/db/schema.prisma", {
      cwd: expect.stringContaining("plugins/resources"),
      absolute: true,
    });
    expect(mockMkdir).toHaveBeenCalledWith(expect.stringContaining("build"), { recursive: true });
    expect(mockWriteFile).toHaveBeenCalledWith(expect.stringContaining("build/schema.prisma"), expect.stringContaining("model User"));
    expect(mockConsoleLog).toHaveBeenCalledWith("Prisma schema synthesised successfully!");
  });

  it("should handle duplicate model names by keeping only the first occurrence", async () => {
    const userSchema1 = `model User {
  id Int @id @default(autoincrement())
  name String
  email String
  
  @@map("user")
  @@schema("core")
}`;

    const userSchema2 = `model User {
  id String @id @default(cuid())
  username String
  password String
  
  @@map("user")
  @@schema("core")
}`;

    mockReadFile.mockResolvedValueOnce(baseSchema).mockResolvedValueOnce(userSchema1).mockResolvedValueOnce(userSchema2);

    mockFg.mockResolvedValue(["/path/to/user1/db/schema.prisma", "/path/to/user2/db/schema.prisma"]);

    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);

    await synthesise();

    // Verify that only the first User model was included
    expect(mockWriteFile).toHaveBeenCalledWith(
      expect.stringContaining("build/schema.prisma"),
      expect.stringMatching(/model User[\s\S]*?email String[\s\S]*?@@map\("user"\)/),
    );

    // Verify the second User model was not included
    const [, combinedSchema] = mockWriteFile.mock.calls[0];
    expect(combinedSchema).not.toContain("username String");
    expect(combinedSchema).not.toContain("password String");
  });

  it("should handle enums and types in addition to models", async () => {
    const schemaWithEnumAndType = `enum UserStatus {
  ACTIVE
  INACTIVE
  PENDING
  
  @@map("user_status")
  @@schema("core")
}

type Address {
  street String
  city   String
  zip    String
}

model User {
  id     Int        @id @default(autoincrement())
  status UserStatus
  
  @@map("user")
  @@schema("core")
}`;

    mockReadFile.mockResolvedValueOnce(baseSchema).mockResolvedValueOnce(schemaWithEnumAndType);

    mockFg.mockResolvedValue(["/path/to/user/db/schema.prisma"]);

    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);

    await synthesise();

    const [, combinedSchema] = mockWriteFile.mock.calls[0];
    expect(combinedSchema).toContain("enum UserStatus");
    expect(combinedSchema).toContain("type Address");
    expect(combinedSchema).toContain("model User");
  });

  it("should handle schemas with no model definitions", async () => {
    const emptySchema = `// This schema has no models
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}`;

    mockReadFile.mockResolvedValueOnce(baseSchema).mockResolvedValueOnce(emptySchema);

    mockFg.mockResolvedValue(["/path/to/empty/db/schema.prisma"]);

    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);

    await synthesise();

    // Should still work, just with base schema
    expect(mockWriteFile).toHaveBeenCalledWith(expect.stringContaining("build/schema.prisma"), baseSchema);
  });

  it("should handle complex model with relationships and attributes", async () => {
    const complexSchema = `model MergeRequest {
  id              Int       @id @default(autoincrement())
  tenantId        String    @map("tenant_id")
  repositoryId    Int       @map("repository_id")
  externalId      String    @map("external_id")
  number          Int
  title           String
  description     String?
  state           String    // open, merged, closed
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  mergedAt        DateTime? @map("merged_at")
  closedAt        DateTime? @map("closed_at")
  authorId        Int       @map("author_id")

  // Relationships
  tenant     Tenant      @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  repository Repository  @relation(fields: [repositoryId], references: [id], onDelete: Cascade)
  author     Contributor @relation("MergeRequestAuthor", fields: [authorId], references: [id], onDelete: Cascade)
  commits    MergeRequestCommit[]

  @@unique([tenantId, repositoryId, externalId])
  @@index([tenantId])
  @@index([repositoryId])
  @@index([authorId])
  @@index([state])
  @@index([createdAt])
  @@index([mergedAt])
  @@map("merge_request")
  @@schema("scm")
}`;

    mockReadFile.mockResolvedValueOnce(baseSchema).mockResolvedValueOnce(complexSchema);

    mockFg.mockResolvedValue(["/path/to/mergerequest/db/schema.prisma"]);

    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);

    await synthesise();

    const [, combinedSchema] = mockWriteFile.mock.calls[0];
    expect(combinedSchema).toContain("model MergeRequest");
    expect(combinedSchema).toContain("@@unique([tenantId, repositoryId, externalId])");
    expect(combinedSchema).toContain("@@index([tenantId])");
    expect(combinedSchema).toContain('@@map("merge_request")');
    expect(combinedSchema).toContain('@@schema("scm")');
  });

  it("should handle multiline model definitions correctly", async () => {
    const multilineSchema = `model User {
  id        String   @id @default(cuid())
  tenantId  String   @map("tenant_id")
  email     String   @unique
  password  String
  apiToken  String   @unique @map("api_token")
  isAdmin   Boolean  @default(false) @map("is_admin")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([email])
  @@index([apiToken])
  @@map("user")
  @@schema("core")
}`;

    mockReadFile.mockResolvedValueOnce(baseSchema).mockResolvedValueOnce(multilineSchema);

    mockFg.mockResolvedValue(["/path/to/user/db/schema.prisma"]);

    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);

    await synthesise();

    const [, combinedSchema] = mockWriteFile.mock.calls[0];
    expect(combinedSchema).toContain("model User");
    expect(combinedSchema).toContain("tenant Tenant @relation");
    expect(combinedSchema).toContain("@@index([tenantId])");
  });

  it("should handle file system errors gracefully", async () => {
    const fsError = new Error("File system error");
    mockReadFile.mockRejectedValue(fsError);

    await expect(synthesise()).rejects.toThrow("File system error");
  });

  it("should handle fast-glob errors gracefully", async () => {
    const globError = new Error("Glob error");
    mockReadFile.mockResolvedValueOnce(baseSchema);
    mockFg.mockRejectedValue(globError);

    await expect(synthesise()).rejects.toThrow("Glob error");
  });

  it("should handle mkdir errors gracefully", async () => {
    const mkdirError = new Error("Cannot create directory");
    mockReadFile.mockResolvedValueOnce(baseSchema);
    mockFg.mockResolvedValue([]);
    mockMkdir.mockRejectedValue(mkdirError);

    await expect(synthesise()).rejects.toThrow("Cannot create directory");
  });

  it("should handle writeFile errors gracefully", async () => {
    const writeError = new Error("Cannot write file");
    mockReadFile.mockResolvedValueOnce(baseSchema);
    mockFg.mockResolvedValue([]);
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockRejectedValue(writeError);

    await expect(synthesise()).rejects.toThrow("Cannot write file");
  });

  it("should create correct directory structure", async () => {
    mockReadFile.mockResolvedValueOnce(baseSchema);
    mockFg.mockResolvedValue([]);
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);

    // Mock path.join to return predictable paths
    mockJoin
      .mockReturnValueOnce("/app/database/prisma/schema.prisma") // Base schema path
      .mockReturnValueOnce("/app/plugins/resources") // Resources directory
      .mockReturnValueOnce("/app/database/build") // Build directory
      .mockReturnValueOnce("/app/database/build/schema.prisma"); // Output path

    await synthesise();

    expect(mockMkdir).toHaveBeenCalledWith("/app/database/build", { recursive: true });
    expect(mockWriteFile).toHaveBeenCalledWith("/app/database/build/schema.prisma", baseSchema);
  });

  it("should maintain model order and preserve base schema position", async () => {
    const schema1 = createMockSchema(["User"]);
    const schema2 = createMockSchema(["Team"]);
    const schema3 = createMockSchema(["Repository"]);

    mockReadFile.mockResolvedValueOnce(baseSchema).mockResolvedValueOnce(schema1).mockResolvedValueOnce(schema2).mockResolvedValueOnce(schema3);

    mockFg.mockResolvedValue(["/path/to/user/db/schema.prisma", "/path/to/team/db/schema.prisma", "/path/to/repository/db/schema.prisma"]);

    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);

    await synthesise();

    const [, combinedSchema] = mockWriteFile.mock.calls[0];

    // Base schema should be at the beginning
    expect(combinedSchema.indexOf("generator client")).toBeLessThan(combinedSchema.indexOf("model User"));

    // Models should be in order they were processed
    expect(combinedSchema.indexOf("model User")).toBeLessThan(combinedSchema.indexOf("model Team"));
    expect(combinedSchema.indexOf("model Team")).toBeLessThan(combinedSchema.indexOf("model Repository"));
  });

  it("should handle models with special characters in names", async () => {
    const specialSchema = `model User_Profile {
  id Int @id @default(autoincrement())
  name String
  
  @@map("user_profile")
  @@schema("core")
}

model UserSession2 {
  id Int @id @default(autoincrement())
  token String
  
  @@map("user_session_2")
  @@schema("core")
}`;

    mockReadFile.mockResolvedValueOnce(baseSchema).mockResolvedValueOnce(specialSchema);

    mockFg.mockResolvedValue(["/path/to/special/db/schema.prisma"]);

    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);

    await synthesise();

    const [, combinedSchema] = mockWriteFile.mock.calls[0];
    expect(combinedSchema).toContain("model User_Profile");
    expect(combinedSchema).toContain("model UserSession2");
  });

  it("should handle schema files with Windows line endings", async () => {
    const windowsSchema = `model User {\r\n  id Int @id @default(autoincrement())\r\n  name String\r\n  \r\n  @@map("user")\r\n  @@schema("core")\r\n}`;

    mockReadFile.mockResolvedValueOnce(baseSchema).mockResolvedValueOnce(windowsSchema);

    mockFg.mockResolvedValue(["/path/to/user/db/schema.prisma"]);

    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);

    await synthesise();

    const [, combinedSchema] = mockWriteFile.mock.calls[0];
    expect(combinedSchema).toContain("model User");
    expect(combinedSchema).toContain('@@map("user")');
  });

  it("should handle empty plugin directories", async () => {
    mockReadFile.mockResolvedValueOnce(baseSchema);
    mockFg.mockResolvedValue([]); // No plugin schemas found

    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);

    await synthesise();

    // Should still work with just base schema
    expect(mockWriteFile).toHaveBeenCalledWith(expect.stringContaining("build/schema.prisma"), baseSchema);
    expect(mockConsoleLog).toHaveBeenCalledWith("Prisma schema synthesised successfully!");
  });

  it("should handle malformed schema files gracefully", async () => {
    const malformedSchema = `model User {
  id Int @id @default(autoincrement()
  name String
  // Missing closing brace`;

    mockReadFile.mockResolvedValueOnce(baseSchema).mockResolvedValueOnce(malformedSchema);

    mockFg.mockResolvedValue(["/path/to/malformed/db/schema.prisma"]);

    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);

    await synthesise();

    // Should still complete successfully (regex won't match malformed model)
    expect(mockWriteFile).toHaveBeenCalledWith(expect.stringContaining("build/schema.prisma"), baseSchema);
    expect(mockConsoleLog).toHaveBeenCalledWith("Prisma schema synthesised successfully!");
  });

  it("should verify correct glob pattern and options", async () => {
    mockReadFile.mockResolvedValueOnce(baseSchema);
    mockFg.mockResolvedValue([]);
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);

    await synthesise();

    expect(mockFg).toHaveBeenCalledWith("**/db/schema.prisma", {
      cwd: expect.stringContaining("plugins/resources"),
      absolute: true,
    });
  });

  it("should handle very large schemas", async () => {
    // Create a large schema with many models
    const largeModels = Array.from({ length: 50 }, (_, i) => `User${i}`);
    const largeSchema = createMockSchema(largeModels);

    mockReadFile.mockResolvedValueOnce(baseSchema).mockResolvedValueOnce(largeSchema);

    mockFg.mockResolvedValue(["/path/to/large/db/schema.prisma"]);

    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);

    await synthesise();

    const [, combinedSchema] = mockWriteFile.mock.calls[0];

    // Verify all models are included
    for (let i = 0; i < 50; i++) {
      expect(combinedSchema).toContain(`model User${i}`);
    }
  });

  it("should handle regex edge cases in model definitions", async () => {
    const edgeCaseSchema = `model User {
  id Int @id @default(autoincrement())
  name String
  email String @unique
  
  @@map("user")
  @@schema("core")
}

// This is a comment with model keyword
/* Block comment with model keyword */

model Team {
  id Int @id @default(autoincrement())
  name String
  
  @@map("team")
  @@schema("core")
}`;

    mockReadFile.mockResolvedValueOnce(baseSchema).mockResolvedValueOnce(edgeCaseSchema);

    mockFg.mockResolvedValue(["/path/to/edge/db/schema.prisma"]);

    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);

    await synthesise();

    const [, combinedSchema] = mockWriteFile.mock.calls[0];
    expect(combinedSchema).toContain("model User");
    expect(combinedSchema).toContain("model Team");
    // Should not contain comments as models
    expect(combinedSchema).not.toContain("// This is a comment with model keyword");
  });

  it("should handle nested model definitions", async () => {
    const nestedSchema = `model User {
  id Int @id @default(autoincrement())
  name String
  profile Profile?
  
  @@map("user")
  @@schema("core")
}

model Profile {
  id Int @id @default(autoincrement())
  userId Int @unique
  bio String?
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("profile")
  @@schema("core")
}`;

    mockReadFile.mockResolvedValueOnce(baseSchema).mockResolvedValueOnce(nestedSchema);

    mockFg.mockResolvedValue(["/path/to/nested/db/schema.prisma"]);

    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);

    await synthesise();

    const [, combinedSchema] = mockWriteFile.mock.calls[0];
    expect(combinedSchema).toContain("model User");
    expect(combinedSchema).toContain("model Profile");
    expect(combinedSchema).toContain("user User @relation");
  });
});
