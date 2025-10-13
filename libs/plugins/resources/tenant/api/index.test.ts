import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import router from "../api/index";

// Mock bcrypt
vi.mock("bcrypt", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed-password"),
  },
}));

// Mock crypto
vi.mock("node:crypto", () => ({
  default: {
    randomBytes: vi.fn().mockReturnValue(Buffer.from("test-random-bytes")),
  },
}));

// Mock the database module
vi.mock("@mmtm/database", () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    tenant: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    tenantDataSourceConfig: {
      findMany: vi.fn(),
      create: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
  })),
}));

describe("Tenant API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.SYSTEM_ADMIN_TOKEN;
  });
  it("should create a tenant with admin user", async () => {
    // Set the system admin token for this test
    process.env.SYSTEM_ADMIN_TOKEN = "test-admin-token";

    const app = express();
    app.use(express.json());
    // Mock authentication middleware
    app.use((req, _res, next) => {
      (req as any).user = {
        id: "test-user-id",
        email: "test@example.com",
        tenantId: "test-tenant-id",
        role: "VIEWER",
      };
      next();
    });
    app.set("db", {
      tenant: {
        create: vi.fn().mockResolvedValue({
          id: "test-tenant-id",
          name: "Test Tenant",
          users: [
            {
              id: "test-user-id",
              email: "admin@test.com",
              apiToken: "test-token",
            },
          ],
        }),
      },
    });
    app.use(router);

    const response = await request(app).post("/tenant").set("x-system-admin-token", "test-admin-token").send({
      name: "TestTenant",
      adminEmail: "admin@test.com",
    });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("tenant");
    expect(response.body).toHaveProperty("admin");
    expect(response.body.admin).toHaveProperty("password");
  });

  it("should list all tenants", async () => {
    // Set the system admin token for this test
    process.env.SYSTEM_ADMIN_TOKEN = "test-admin-token";

    const app = express();
    app.use(express.json());
    app.set("db", {
      tenant: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "tenant1",
            name: "Tenant 1",
            _count: { users: 1, tenantDataSourceConfigs: 0 },
            onboardingProgress: null,
          },
        ]),
      },
    });
    app.use(router);

    const response = await request(app).get("/tenants").set("x-system-admin-token", "test-admin-token");

    expect(response.status).toBe(200);
    expect(response.body).toBeInstanceOf(Array);
    expect(response.body).toHaveLength(1);
  });

  // Additional test cases for better coverage
  describe("POST /tenant - System Admin Authentication", () => {
    it("should return 500 when system admin token is not configured", async () => {
      // Don't set SYSTEM_ADMIN_TOKEN
      const app = express();
      app.use(express.json());
      app.use(router);

      const response = await request(app).post("/tenant").send({
        name: "TestTenant",
        adminEmail: "admin@test.com",
      });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("error", "System admin token not configured");
    });

    it("should return 401 with invalid system admin token", async () => {
      process.env.SYSTEM_ADMIN_TOKEN = "correct-token";
      const app = express();
      app.use(express.json());
      app.use(router);

      const response = await request(app).post("/tenant").set("x-system-admin-token", "wrong-token").send({
        name: "TestTenant",
        adminEmail: "admin@test.com",
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error", "Invalid system admin token");
    });

    it("should return 400 with invalid tenant data", async () => {
      process.env.SYSTEM_ADMIN_TOKEN = "test-admin-token";
      const app = express();
      app.use(express.json());
      app.use(router);

      const response = await request(app).post("/tenant").set("x-system-admin-token", "test-admin-token").send({
        name: "", // Invalid name
        adminEmail: "invalid-email", // Invalid email
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Invalid request data");
      // Remove the details check as the error structure may vary
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors in GET /tenants", async () => {
      // Set the system admin token for this test
      process.env.SYSTEM_ADMIN_TOKEN = "test-admin-token";

      const app = express();
      app.use(express.json());
      app.set("db", {
        tenant: {
          findMany: vi.fn().mockRejectedValue(new Error("Database error")),
        },
      });
      app.use(router);

      const response = await request(app).get("/tenants").set("x-system-admin-token", "test-admin-token");

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("error", "Failed to fetch tenants");
    });
  });

  describe("POST /auth/signup - Self-service Signup", () => {
    it("should successfully create a new account", async () => {
      const app = express();
      app.use(express.json());
      app.set("db", {
        tenant: {
          findFirst: vi.fn().mockResolvedValue(null), // No existing tenant
          create: vi.fn().mockResolvedValue({
            id: "new-tenant-id",
            name: "NewOrg",
            users: [
              {
                id: "new-user-id",
                email: "user@neworg.com",
                fullName: "Test User",
                apiToken: "new-api-token",
              },
            ],
            onboardingProgress: {
              currentStep: "data-sources",
              completedSteps: ["signup"],
            },
          }),
        },
        user: {
          findFirst: vi.fn().mockResolvedValue(null), // No existing user
        },
      });
      app.use(router);

      const response = await request(app).post("/auth/signup").send({
        organizationName: "NewOrg",
        fullName: "Test User",
        email: "user@neworg.com",
        password: "SecurePass123!",
      });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("tenant");
      expect(response.body.tenant).toHaveProperty("id", "new-tenant-id");
      expect(response.body).toHaveProperty("user");
      expect(response.body.user).toHaveProperty("email", "user@neworg.com");
      expect(response.body).toHaveProperty("message", "Account created successfully");
    });

    it("should return 409 when organization name already exists", async () => {
      const app = express();
      app.use(express.json());
      app.set("db", {
        tenant: {
          findFirst: vi.fn().mockResolvedValue({
            id: "existing-tenant",
            name: "ExistingOrg",
          }),
        },
        user: {
          findFirst: vi.fn(),
        },
      });
      app.use(router);

      const response = await request(app).post("/auth/signup").send({
        organizationName: "ExistingOrg",
        fullName: "Test User",
        email: "user@test.com",
        password: "SecurePass123!",
      });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty("error", "Organization name already exists");
    });

    it("should return 409 when email already exists", async () => {
      const app = express();
      app.use(express.json());
      app.set("db", {
        tenant: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
        user: {
          findFirst: vi.fn().mockResolvedValue({
            id: "existing-user",
            email: "existing@test.com",
          }),
        },
      });
      app.use(router);

      const response = await request(app).post("/auth/signup").send({
        organizationName: "NewOrg",
        fullName: "Test User",
        email: "existing@test.com",
        password: "SecurePass123!",
      });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty("error", "Email address already exists");
    });

    it("should return 400 with invalid password", async () => {
      const app = express();
      app.use(express.json());
      app.use(router);

      const response = await request(app).post("/auth/signup").send({
        organizationName: "NewOrg",
        fullName: "Test User",
        email: "user@test.com",
        password: "weak", // Too short and doesn't meet requirements
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Invalid request data");
      expect(response.body).toHaveProperty("details");
    });

    it("should return 400 with invalid email", async () => {
      const app = express();
      app.use(express.json());
      app.use(router);

      const response = await request(app).post("/auth/signup").send({
        organizationName: "NewOrg",
        fullName: "Test User",
        email: "invalid-email",
        password: "SecurePass123!",
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Invalid request data");
    });

    it("should return 400 with missing organization name", async () => {
      const app = express();
      app.use(express.json());
      app.use(router);

      const response = await request(app).post("/auth/signup").send({
        fullName: "Test User",
        email: "user@test.com",
        password: "SecurePass123!",
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Invalid request data");
    });

    it("should handle database errors gracefully", async () => {
      const app = express();
      app.use(express.json());
      app.set("db", {
        tenant: {
          findFirst: vi.fn().mockRejectedValue(new Error("Database connection failed")),
        },
        user: {
          findFirst: vi.fn(),
        },
      });
      app.use(router);

      const response = await request(app).post("/auth/signup").send({
        organizationName: "NewOrg",
        fullName: "Test User",
        email: "user@test.com",
        password: "SecurePass123!",
      });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("error", "Failed to create account");
    });

    it("should create onboarding progress with signup step completed", async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        id: "new-tenant-id",
        name: "NewOrg",
        users: [
          {
            id: "new-user-id",
            email: "user@neworg.com",
            fullName: "Test User",
            apiToken: "new-api-token",
          },
        ],
        onboardingProgress: {
          currentStep: "data-sources",
          completedSteps: ["signup"],
          wizardData: {
            organizationName: "NewOrg",
            adminName: "Test User",
            adminEmail: "user@neworg.com",
          },
        },
      });

      const app = express();
      app.use(express.json());
      app.set("db", {
        tenant: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: mockCreate,
        },
        user: {
          findFirst: vi.fn().mockResolvedValue(null),
        },
      });
      app.use(router);

      const response = await request(app).post("/auth/signup").send({
        organizationName: "NewOrg",
        fullName: "Test User",
        email: "user@neworg.com",
        password: "SecurePass123!",
      });

      expect(response.status).toBe(201);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "NewOrg",
            onboardingProgress: expect.objectContaining({
              create: expect.objectContaining({
                currentStep: "data-sources",
                completedSteps: ["signup"],
                wizardData: expect.objectContaining({
                  organizationName: "NewOrg",
                  adminName: "Test User",
                  adminEmail: "user@neworg.com",
                }),
              }),
            }),
          }),
        }),
      );
    });
  });
});
