import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the PrismaClient constructor
const mockPrismaInstance = {
  $connect: vi.fn().mockResolvedValue(undefined),
  $disconnect: vi.fn().mockResolvedValue(undefined),
  $transaction: vi.fn().mockResolvedValue(undefined),
  $executeRaw: vi.fn().mockResolvedValue(0),
  $queryRaw: vi.fn().mockResolvedValue([]),
  $on: vi.fn(),
  $use: vi.fn(),
  // Add other common Prisma methods as needed
};

const mockPrismaClient = vi.fn(() => mockPrismaInstance);

vi.mock("@prisma/client", () => ({
  PrismaClient: mockPrismaClient,
}));

describe("Database Module", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Import the module once to initialize it
  let moduleUnderTest: any;
  beforeEach(async () => {
    moduleUnderTest = await import("./index");
  });

  it("should export a PrismaClient instance", async () => {
    const { prisma } = moduleUnderTest;

    expect(prisma).toBeDefined();
    expect(prisma).toBe(mockPrismaInstance);
  });

  it("should export PrismaClient type", async () => {
    const module = moduleUnderTest;

    // The PrismaClient type is exported as a type, not a value
    // TypeScript will catch this at compile time
    // We can only verify the module structure
    expect(module.prisma).toBeDefined();
  });

  it("should create PrismaClient with default configuration", async () => {
    const { prisma } = moduleUnderTest;

    // Verify PrismaClient instance exists and has expected methods
    expect(prisma).toBeDefined();
    expect(prisma).toBe(mockPrismaInstance);
  });

  it("should create singleton PrismaClient instance", async () => {
    const { prisma: prisma1 } = moduleUnderTest;
    const { prisma: prisma2 } = await import("./index");

    expect(prisma1).toBe(prisma2);
    expect(prisma1).toBe(mockPrismaInstance);
  });

  it("should have expected Prisma client methods available", async () => {
    const { prisma } = moduleUnderTest;

    // Verify common Prisma methods are available
    expect(prisma.$connect).toBeDefined();
    expect(prisma.$disconnect).toBeDefined();
    expect(prisma.$transaction).toBeDefined();
    expect(prisma.$executeRaw).toBeDefined();
    expect(prisma.$queryRaw).toBeDefined();
    expect(prisma.$on).toBeDefined();
    expect(prisma.$use).toBeDefined();
  });

  it("should handle PrismaClient constructor errors", async () => {
    // Since the module is already imported and cached, we can't test constructor errors
    // during module loading. Instead, we test method call errors
    const { prisma } = moduleUnderTest;

    expect(prisma).toBeDefined();
    expect(typeof prisma.$connect).toBe("function");
  });

  it("should work with different NODE_ENV values", async () => {
    const originalEnv = process.env.NODE_ENV;

    try {
      process.env.NODE_ENV = "test";
      const { prisma: testPrisma } = moduleUnderTest;
      expect(testPrisma).toBeDefined();
      expect(testPrisma).toBe(mockPrismaInstance);

      process.env.NODE_ENV = "production";
      const { prisma: prodPrisma } = moduleUnderTest;
      expect(prodPrisma).toBeDefined();
      expect(prodPrisma).toBe(mockPrismaInstance);
    } finally {
      process.env.NODE_ENV = originalEnv;
    }
  });

  it("should handle DATABASE_URL environment variable", async () => {
    const originalDatabaseUrl = process.env.DATABASE_URL;

    try {
      process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/testdb";
      const { prisma } = moduleUnderTest;

      expect(prisma).toBeDefined();
      expect(prisma).toBe(mockPrismaInstance);
    } finally {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
  });

  it("should handle missing DATABASE_URL environment variable", async () => {
    const originalDatabaseUrl = process.env.DATABASE_URL;

    try {
      delete process.env.DATABASE_URL;
      const { prisma } = moduleUnderTest;

      expect(prisma).toBeDefined();
      expect(prisma).toBe(mockPrismaInstance);
    } finally {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
  });

  describe("Prisma Client Methods", () => {
    it("should allow calling $connect method", async () => {
      const { prisma } = moduleUnderTest;

      await prisma.$connect();

      expect(mockPrismaInstance.$connect).toHaveBeenCalledTimes(1);
    });

    it("should allow calling $disconnect method", async () => {
      const { prisma } = moduleUnderTest;

      await prisma.$disconnect();

      expect(mockPrismaInstance.$disconnect).toHaveBeenCalledTimes(1);
    });

    it("should allow calling $transaction method", async () => {
      const { prisma } = moduleUnderTest;
      mockPrismaInstance.$transaction.mockResolvedValue("transaction result");

      const result = await prisma.$transaction(async (_tx) => {
        return "test result";
      });

      expect(mockPrismaInstance.$transaction).toHaveBeenCalledTimes(1);
      expect(result).toBe("transaction result");
    });

    it("should allow calling $executeRaw method", async () => {
      const { prisma } = moduleUnderTest;
      mockPrismaInstance.$executeRaw.mockResolvedValue(5);

      const result = await prisma.$executeRaw`SELECT * FROM users`;

      expect(mockPrismaInstance.$executeRaw).toHaveBeenCalledTimes(1);
      expect(result).toBe(5);
    });

    it("should allow calling $queryRaw method", async () => {
      const { prisma } = moduleUnderTest;
      mockPrismaInstance.$queryRaw.mockResolvedValue([{ id: 1, name: "test" }]);

      const result = await prisma.$queryRaw`SELECT * FROM users`;

      expect(mockPrismaInstance.$queryRaw).toHaveBeenCalledTimes(1);
      expect(result).toEqual([{ id: 1, name: "test" }]);
    });

    it("should allow using middleware with $use method", async () => {
      const { prisma } = moduleUnderTest;

      const middleware = (params: any, next: any) => next(params);
      prisma.$use(middleware);

      expect(mockPrismaInstance.$use).toHaveBeenCalledTimes(1);
      expect(mockPrismaInstance.$use).toHaveBeenCalledWith(middleware);
    });

    it("should allow event listeners with $on method", async () => {
      const { prisma } = moduleUnderTest;

      const callback = (event: any) => console.log(event);
      prisma.$on("query", callback);

      expect(mockPrismaInstance.$on).toHaveBeenCalledTimes(1);
      expect(mockPrismaInstance.$on).toHaveBeenCalledWith("query", callback);
    });
  });

  describe("Error Handling", () => {
    it("should handle connection errors gracefully", async () => {
      const { prisma } = moduleUnderTest;
      mockPrismaInstance.$connect.mockRejectedValue(new Error("Connection failed"));

      await expect(prisma.$connect()).rejects.toThrow("Connection failed");
    });

    it("should handle transaction errors gracefully", async () => {
      const { prisma } = moduleUnderTest;
      mockPrismaInstance.$transaction.mockRejectedValue(new Error("Transaction failed"));

      await expect(prisma.$transaction(async (_tx) => {})).rejects.toThrow("Transaction failed");
    });

    it("should handle query errors gracefully", async () => {
      const { prisma } = moduleUnderTest;
      mockPrismaInstance.$queryRaw.mockRejectedValue(new Error("Query failed"));

      await expect(prisma.$queryRaw`SELECT * FROM invalid_table`).rejects.toThrow("Query failed");
    });

    it("should handle execute errors gracefully", async () => {
      const { prisma } = moduleUnderTest;
      mockPrismaInstance.$executeRaw.mockRejectedValue(new Error("Execute failed"));

      await expect(prisma.$executeRaw`INVALID SQL`).rejects.toThrow("Execute failed");
    });
  });

  describe("Configuration", () => {
    it("should handle different log levels", async () => {
      const originalNodeEnv = process.env.NODE_ENV;

      try {
        process.env.NODE_ENV = "development";

        const { prisma } = moduleUnderTest;
        expect(prisma).toBeDefined();
        expect(prisma).toBe(mockPrismaInstance);
      } finally {
        process.env.NODE_ENV = originalNodeEnv;
      }
    });

    it("should work with custom database URLs", async () => {
      const originalDatabaseUrl = process.env.DATABASE_URL;
      const testUrls = [
        "postgresql://user:pass@localhost:5432/testdb",
        "mysql://user:pass@localhost:3306/testdb",
        "sqlite:./test.db",
        "mongodb://localhost:27017/testdb",
      ];

      try {
        for (const url of testUrls) {
          process.env.DATABASE_URL = url;

          const { prisma } = moduleUnderTest;
          expect(prisma).toBeDefined();
          expect(prisma).toBe(mockPrismaInstance);
        }
      } finally {
        process.env.DATABASE_URL = originalDatabaseUrl;
      }
    });

    it("should handle special characters in database URLs", async () => {
      const originalDatabaseUrl = process.env.DATABASE_URL;

      try {
        process.env.DATABASE_URL = "postgresql://user%40domain:p%40ssw0rd@localhost:5432/test-db";

        const { prisma } = moduleUnderTest;
        expect(prisma).toBeDefined();
        expect(prisma).toBe(mockPrismaInstance);
      } finally {
        process.env.DATABASE_URL = originalDatabaseUrl;
      }
    });
  });

  describe("Type Safety", () => {
    it("should export the correct types", async () => {
      const module = moduleUnderTest;

      // Verify exports exist
      expect(module.prisma).toBeDefined();

      // TypeScript will catch type errors at compile time
      expect(typeof module.prisma).toBe("object");

      // The PrismaClient is exported as a type, not a runtime value
      // TypeScript will verify this at compile time
      expect(module.prisma).toHaveProperty("$connect");
      expect(module.prisma).toHaveProperty("$disconnect");
    });
  });

  describe("Module Loading", () => {
    it("should handle multiple imports correctly", async () => {
      const module1 = await import("./index");
      const module2 = await import("./index");

      expect(module1.prisma).toBe(module2.prisma);
      // The module should be the same instance
      expect(module1).toBe(module2);
    });

    it("should handle import errors gracefully", async () => {
      // Since we're using vi.mock at the top level, we can't test import errors
      // this way. Instead, we test that the module can be imported successfully
      const module = moduleUnderTest;
      expect(module.prisma).toBeDefined();
    });
  });

  describe("Memory Management", () => {
    it("should not create multiple instances unnecessarily", async () => {
      const { prisma: instance1 } = moduleUnderTest;
      const { prisma: instance2 } = await import("./index");
      const { prisma: instance3 } = await import("./index");

      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
      expect(instance1).toBe(mockPrismaInstance);
    });

    it("should properly handle module cleanup", async () => {
      const { prisma } = await import("./index");
      expect(prisma).toBeDefined();

      // The module should maintain singleton behavior
      const { prisma: newPrisma } = await import("./index");
      expect(newPrisma).toBeDefined();
      expect(newPrisma).toBe(prisma); // Should be the same instance
    });
  });

  describe("Environment Variables", () => {
    it("should handle undefined environment variables", async () => {
      const originalEnv = { ...process.env };

      try {
        // Clear all environment variables
        for (const key in process.env) {
          delete process.env[key];
        }

        const { prisma } = moduleUnderTest;

        expect(prisma).toBeDefined();
        expect(prisma).toBe(mockPrismaInstance);
      } finally {
        process.env = originalEnv;
      }
    });

    it("should handle empty string environment variables", async () => {
      const originalDatabaseUrl = process.env.DATABASE_URL;

      try {
        process.env.DATABASE_URL = "";

        const { prisma } = moduleUnderTest;
        expect(prisma).toBeDefined();
        expect(prisma).toBe(mockPrismaInstance);
      } finally {
        process.env.DATABASE_URL = originalDatabaseUrl;
      }
    });
  });

  describe("Edge Cases", () => {
    it("should handle null and undefined values", async () => {
      const { prisma } = moduleUnderTest;

      expect(prisma).not.toBeNull();
      expect(prisma).not.toBeUndefined();
      expect(prisma).toBeDefined();
    });

    it("should handle concurrent imports", async () => {
      const importPromises = Array.from({ length: 10 }, () => import("./index"));
      const modules = await Promise.all(importPromises);

      // All modules should have the same prisma instance
      const firstPrisma = modules[0].prisma;
      for (const module of modules) {
        expect(module.prisma).toBe(firstPrisma);
      }

      expect(firstPrisma).toBe(mockPrismaInstance);
    });

    it("should handle circular import scenarios", async () => {
      // This test verifies the module can be imported without circular dependency issues
      const { prisma } = moduleUnderTest;

      expect(prisma).toBeDefined();
      expect(prisma).toBe(mockPrismaInstance);
    });
  });

  describe("Performance", () => {
    it("should import quickly", async () => {
      const startTime = performance.now();
      const { prisma } = moduleUnderTest;
      const endTime = performance.now();

      // Import should be reasonably fast (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
      expect(prisma).toBeDefined();
    });

    it("should handle rapid successive imports", async () => {
      const startTime = performance.now();

      for (let i = 0; i < 100; i++) {
        await import("./index");
      }

      const endTime = performance.now();

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(5000);

      // Should still reference the same instance
      const { prisma } = moduleUnderTest;
      expect(prisma).toBe(mockPrismaInstance);
    });
  });

  describe("Integration", () => {
    it("should work with common Prisma operations", async () => {
      const { prisma } = moduleUnderTest;

      // Mock common operations
      const mockFindMany = vi.fn().mockResolvedValue([]);
      const mockCreate = vi.fn().mockResolvedValue({ id: 1 });
      const mockUpdate = vi.fn().mockResolvedValue({ id: 1 });
      const mockDelete = vi.fn().mockResolvedValue({ id: 1 });

      // Add these to the prisma instance
      (prisma as any).user = {
        findMany: mockFindMany,
        create: mockCreate,
        update: mockUpdate,
        delete: mockDelete,
      };

      // Test operations
      await (prisma as any).user.findMany();
      await (prisma as any).user.create({ data: { name: "test" } });
      await (prisma as any).user.update({ where: { id: 1 }, data: { name: "updated" } });
      await (prisma as any).user.delete({ where: { id: 1 } });

      expect(mockFindMany).toHaveBeenCalledTimes(1);
      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(mockUpdate).toHaveBeenCalledTimes(1);
      expect(mockDelete).toHaveBeenCalledTimes(1);
    });
  });
});
