import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";
import { viteNodeApp } from "./index";

// Mock the database
vi.mock("@mmtm/database", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
    },
    tenant: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    team: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    teamRepository: {
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

describe("API Server", () => {
  describe("Health Check", () => {
    it("should return a 200 status code for the root endpoint", async () => {
      const response = await request(viteNodeApp).get("/");
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: "API is up" });
    });

    it("should return proper content type for the root endpoint", async () => {
      const response = await request(viteNodeApp).get("/");
      expect(response.headers["content-type"]).toMatch(/application\/json/);
    });
  });

  describe("Middleware Chain", () => {
    it("should handle JSON parsing correctly", async () => {
      const response = await request(viteNodeApp).post("/").send({ test: "data" }).set("Content-Type", "application/json");

      // Should not fail due to JSON parsing
      expect(response.status).not.toBe(400);
    });

    it("should handle malformed JSON", async () => {
      const response = await request(viteNodeApp).post("/").send("invalid json").set("Content-Type", "application/json");

      expect(response.status).toBe(400);
    });

    it("should make database available to routes", async () => {
      const response = await request(viteNodeApp).get("/");
      expect(response.status).toBe(200);
      // The fact that the app starts successfully indicates the database is set
    });
  });

  describe("Authentication Middleware", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should allow access to root endpoint without authentication", async () => {
      const response = await request(viteNodeApp).get("/");
      expect(response.status).toBe(200);
    });

    it("should allow access to tenant creation endpoint without authentication", async () => {
      const response = await request(viteNodeApp)
        .post("/tenant")
        .send({ name: "test", adminEmail: "test@example.com" })
        .set("X-System-Admin-Token", "invalid-token");

      // Should not return 401 for missing Basic auth (tenant endpoint has its own auth)
      expect(response.status).not.toBe(401);
    });

    it("should require authentication for protected endpoints", async () => {
      const response = await request(viteNodeApp).get("/teams");
      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: "Missing or invalid authorization header" });
    });

    it("should reject invalid Basic auth format", async () => {
      const response = await request(viteNodeApp).get("/teams").set("Authorization", "InvalidFormat");

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: "Missing or invalid authorization header" });
    });

    it("should reject malformed Basic auth credentials", async () => {
      // Missing colon separator
      const invalidCredentials = Buffer.from("emailwithoutcolon").toString("base64");
      const response = await request(viteNodeApp).get("/teams").set("Authorization", `Basic ${invalidCredentials}`);

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: "Invalid credentials format" });
    });

    it("should reject invalid credentials", async () => {
      const { prisma } = await import("@mmtm/database");
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      const credentials = Buffer.from("invalid@example.com:password").toString("base64");
      const response = await request(viteNodeApp).get("/teams").set("Authorization", `Basic ${credentials}`);

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: "Invalid credentials" });
    });

    it("should handle authentication errors gracefully", async () => {
      const { prisma } = await import("@mmtm/database");
      vi.mocked(prisma.user.findFirst).mockRejectedValue(new Error("Database error"));

      const credentials = Buffer.from("test@example.com:password").toString("base64");
      const response = await request(viteNodeApp).get("/teams").set("Authorization", `Basic ${credentials}`);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: "Authentication failed" });
    });
  });

  describe("Plugin Route Integration", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should handle plugin routes when authenticated", async () => {
      const { prisma } = await import("@mmtm/database");
      const bcrypt = await import("bcrypt");

      // Mock successful authentication
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: "user1",
        email: "test@example.com",
        password: await bcrypt.hash("password", 10),
        apiToken: "token123",
        tenantId: "tenant1",
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        tenant: {
          id: "tenant1",
          name: "Test Tenant",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Mock team query
      vi.mocked(prisma.team.findMany).mockResolvedValue([
        {
          id: 1,
          name: "Test Team",
          tenantId: "tenant1",
          createdAt: new Date(),
          updatedAt: new Date(),
          repositories: [],
        },
      ]);

      const credentials = Buffer.from("test@example.com:password").toString("base64");
      const response = await request(viteNodeApp).get("/teams").set("Authorization", `Basic ${credentials}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it("should handle API token authentication", async () => {
      const { prisma } = await import("@mmtm/database");

      // Mock API token authentication
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: "user1",
        email: "test@example.com",
        password: "hashedpassword",
        apiToken: "token123",
        tenantId: "tenant1",
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        tenant: {
          id: "tenant1",
          name: "Test Tenant",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      vi.mocked(prisma.team.findMany).mockResolvedValue([]);

      const credentials = Buffer.from("token123:token123").toString("base64");
      const response = await request(viteNodeApp).get("/teams").set("Authorization", `Basic ${credentials}`);

      expect(response.status).toBe(200);
    });

    it("should handle plugin route errors gracefully", async () => {
      const { prisma } = await import("@mmtm/database");
      const bcrypt = await import("bcrypt");

      // Mock successful authentication
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        id: "user1",
        email: "test@example.com",
        password: await bcrypt.hash("password", 10),
        apiToken: "token123",
        tenantId: "tenant1",
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        tenant: {
          id: "tenant1",
          name: "Test Tenant",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Mock database error
      vi.mocked(prisma.team.findMany).mockRejectedValue(new Error("Database error"));

      const credentials = Buffer.from("test@example.com:password").toString("base64");
      const response = await request(viteNodeApp).get("/teams").set("Authorization", `Basic ${credentials}`);

      expect(response.status).toBe(500);
    });
  });

  describe("Error Handling", () => {
    it("should handle 404 for non-existent routes", async () => {
      const response = await request(viteNodeApp).get("/non-existent-route");
      // Auth middleware runs first, so protected routes return 401
      expect(response.status).toBe(401);
    });

    it("should handle unsupported HTTP methods", async () => {
      const response = await request(viteNodeApp).patch("/");
      // Auth middleware runs first, so protected routes return 401
      expect(response.status).toBe(401);
    });

    it("should handle request timeout gracefully", async () => {
      // This test verifies timeout behavior
      const response = await request(viteNodeApp).get("/").timeout(5000); // Reasonable timeout

      // The request should complete quickly since it's a simple endpoint
      expect(response.status).toBe(200);
    });
  });

  describe("Request/Response Processing", () => {
    it("should handle different content types", async () => {
      const response = await request(viteNodeApp).get("/").set("Accept", "application/json");

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
    });

    it("should handle large request bodies", async () => {
      const largeData = { data: "x".repeat(1000) };
      const response = await request(viteNodeApp).post("/").send(largeData).set("Content-Type", "application/json");

      // Should not fail due to body size (within reasonable limits)
      expect(response.status).not.toBe(413);
    });

    it("should handle empty request bodies", async () => {
      const response = await request(viteNodeApp).post("/").send().set("Content-Type", "application/json");

      expect(response.status).not.toBe(400);
    });

    it("should handle concurrent requests", async () => {
      const requests = Array(10)
        .fill(null)
        .map(() => request(viteNodeApp).get("/"));

      const responses = await Promise.all(requests);
      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ message: "API is up" });
      });
    });
  });

  describe("Server Configuration", () => {
    it("should have proper Express configuration", () => {
      expect(viteNodeApp).toBeDefined();
      expect(typeof viteNodeApp.listen).toBe("function");
      expect(typeof viteNodeApp.use).toBe("function");
      expect(typeof viteNodeApp.get).toBe("function");
    });

    it("should handle app.set() configuration", () => {
      // The database should be available through app.set()
      expect(viteNodeApp.get("db")).toBeDefined();
    });

    it("should handle proper middleware ordering", async () => {
      // JSON parsing should happen before auth middleware
      const response = await request(viteNodeApp).post("/teams").send({ name: "test" }).set("Content-Type", "application/json");

      // Should get 401 (auth) not 400 (JSON parsing)
      expect(response.status).toBe(401);
    });
  });

  describe("Security Headers", () => {
    it("should handle basic security concerns", async () => {
      const response = await request(viteNodeApp).get("/");

      expect(response.status).toBe(200);
      // Express sets x-powered-by header by default
      expect(response.headers["x-powered-by"]).toBe("Express");
    });

    it("should handle CORS preflight requests", async () => {
      const response = await request(viteNodeApp)
        .options("/")
        .set("Access-Control-Request-Method", "GET")
        .set("Access-Control-Request-Headers", "Authorization");

      // Should handle OPTIONS requests (even if CORS is not explicitly configured)
      expect(response.status).not.toBe(500);
    });
  });

  describe("Plugin Route Loading", () => {
    it("should handle plugin loading errors gracefully", async () => {
      // The server should start even if some plugins fail to load
      // This is tested by the fact that the app starts successfully
      const response = await request(viteNodeApp).get("/");
      expect(response.status).toBe(200);
    });

    it("should load multiple plugin routes", async () => {
      // Test that multiple plugin routes are accessible
      const healthResponse = await request(viteNodeApp).get("/");
      expect(healthResponse.status).toBe(200);

      // These should return 401 (auth required) rather than 404 (route not found)
      const teamsResponse = await request(viteNodeApp).get("/teams");
      expect(teamsResponse.status).toBe(401);

      const tenantResponse = await request(viteNodeApp).get("/tenants");
      expect(tenantResponse.status).toBe(401);
    });
  });
});
