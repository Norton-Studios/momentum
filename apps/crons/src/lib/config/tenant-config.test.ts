import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTenantConfigurations, type TenantEnvironment } from "./tenant-config";
import type { PrismaClient } from "@mmtm/database";

// Mock PrismaClient
const mockDb = {
  tenantDataSourceConfig: {
    findMany: vi.fn(),
  },
} as unknown as PrismaClient;

describe("tenant-config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getTenantConfigurations", () => {
    it("should group configurations by tenant and data source", async () => {
      const mockConfigs = [
        {
          id: "1",
          tenantId: "tenant-1",
          dataSource: "github",
          key: "GITHUB_TOKEN",
          value: "ghp_test123",
          tenant: { id: "tenant-1", name: "Test Tenant 1" },
        },
        {
          id: "2",
          tenantId: "tenant-1",
          dataSource: "github",
          key: "GITHUB_ORG",
          value: "test-org",
          tenant: { id: "tenant-1", name: "Test Tenant 1" },
        },
        {
          id: "3",
          tenantId: "tenant-2",
          dataSource: "gitlab",
          key: "GITLAB_TOKEN",
          value: "glpat_test456",
          tenant: { id: "tenant-2", name: "Test Tenant 2" },
        },
      ];

      (mockDb.tenantDataSourceConfig.findMany as any).mockResolvedValue(mockConfigs);

      const result = await getTenantConfigurations(mockDb);

      expect(mockDb.tenantDataSourceConfig.findMany).toHaveBeenCalledWith({
        include: { tenant: true },
      });

      expect(result).toHaveLength(2);

      // Check tenant-1 github config
      const tenant1Github = result.find((env) => env.tenantId === "tenant-1" && env.dataSource === "github");
      expect(tenant1Github).toEqual({
        tenantId: "tenant-1",
        dataSource: "github",
        env: {
          GITHUB_TOKEN: "ghp_test123",
          GITHUB_ORG: "test-org",
        },
      });

      // Check tenant-2 gitlab config
      const tenant2Gitlab = result.find((env) => env.tenantId === "tenant-2" && env.dataSource === "gitlab");
      expect(tenant2Gitlab).toEqual({
        tenantId: "tenant-2",
        dataSource: "gitlab",
        env: {
          GITLAB_TOKEN: "glpat_test456",
        },
      });
    });

    it("should handle empty configurations", async () => {
      (mockDb.tenantDataSourceConfig.findMany as any).mockResolvedValue([]);

      const result = await getTenantConfigurations(mockDb);

      expect(result).toEqual([]);
    });

    it("should handle single tenant with multiple data sources", async () => {
      const mockConfigs = [
        {
          id: "1",
          tenantId: "tenant-1",
          dataSource: "github",
          key: "GITHUB_TOKEN",
          value: "ghp_token",
          tenant: { id: "tenant-1", name: "Test Tenant" },
        },
        {
          id: "2",
          tenantId: "tenant-1",
          dataSource: "gitlab",
          key: "GITLAB_TOKEN",
          value: "glpat_token",
          tenant: { id: "tenant-1", name: "Test Tenant" },
        },
      ];

      (mockDb.tenantDataSourceConfig.findMany as any).mockResolvedValue(mockConfigs);

      const result = await getTenantConfigurations(mockDb);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        tenantId: "tenant-1",
        dataSource: "github",
        env: { GITHUB_TOKEN: "ghp_token" },
      });
      expect(result[1]).toEqual({
        tenantId: "tenant-1",
        dataSource: "gitlab",
        env: { GITLAB_TOKEN: "glpat_token" },
      });
    });

    it("should handle multiple keys for the same tenant/data source combination", async () => {
      const mockConfigs = [
        {
          id: "1",
          tenantId: "tenant-1",
          dataSource: "github",
          key: "GITHUB_TOKEN",
          value: "ghp_token",
          tenant: { id: "tenant-1", name: "Test Tenant" },
        },
        {
          id: "2",
          tenantId: "tenant-1",
          dataSource: "github",
          key: "GITHUB_ORG",
          value: "my-org",
          tenant: { id: "tenant-1", name: "Test Tenant" },
        },
        {
          id: "3",
          tenantId: "tenant-1",
          dataSource: "github",
          key: "GITHUB_BASE_URL",
          value: "https://github.enterprise.com",
          tenant: { id: "tenant-1", name: "Test Tenant" },
        },
      ];

      (mockDb.tenantDataSourceConfig.findMany as any).mockResolvedValue(mockConfigs);

      const result = await getTenantConfigurations(mockDb);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        tenantId: "tenant-1",
        dataSource: "github",
        env: {
          GITHUB_TOKEN: "ghp_token",
          GITHUB_ORG: "my-org",
          GITHUB_BASE_URL: "https://github.enterprise.com",
        },
      });
    });

    it("should handle database errors", async () => {
      const error = new Error("Database connection failed");
      (mockDb.tenantDataSourceConfig.findMany as any).mockRejectedValue(error);

      await expect(getTenantConfigurations(mockDb)).rejects.toThrow("Database connection failed");
    });
  });

  describe("TenantEnvironment interface", () => {
    it("should have correct type structure", () => {
      const tenantEnv: TenantEnvironment = {
        tenantId: "test-tenant",
        dataSource: "test-source",
        env: { KEY: "value" },
      };

      expect(tenantEnv.tenantId).toBe("test-tenant");
      expect(tenantEnv.dataSource).toBe("test-source");
      expect(tenantEnv.env).toEqual({ KEY: "value" });
    });
  });
});
