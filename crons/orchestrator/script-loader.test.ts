import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSource, DataSourceConfig, DbClient } from "../db.ts";
import { getEnabledScripts } from "./script-loader.js";

type DataSourceWithConfig = DataSource & { configs: DataSourceConfig[] };

vi.mock("../data-sources/github/index.js", () => ({
  scripts: [
    {
      dataSourceName: "GITHUB",
      resource: "repository",
      dependsOn: [],
      importWindowDays: 365,
      run: vi.fn(),
    },
    {
      dataSourceName: "GITHUB",
      resource: "contributor",
      dependsOn: ["repository"],
      importWindowDays: 365,
      run: vi.fn(),
    },
  ],
}));

describe("script-loader", () => {
  describe("getEnabledScripts", () => {
    let mockDb: PrismaClient;

    beforeEach(() => {
      mockDb = {
        dataSource: {
          findMany: vi.fn(),
        },
      } as unknown as DbClient;
    });

    it("should return scripts for enabled data sources", async () => {
      // Arrange
      const mockDataSourceWithConfig: DataSourceWithConfig = {
        id: "ds-123",
        organizationId: "org-1",
        name: "GitHub - MyOrg",
        provider: "GITHUB",
        description: null,
        isEnabled: true,
        syncIntervalMinutes: 15,
        lastSyncAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        configs: [
          {
            id: "config-1",
            dataSourceId: "ds-123",
            key: "GITHUB_TOKEN",
            value: "ghp_abc123",
            isSecret: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      vi.mocked(mockDb.dataSource.findMany).mockResolvedValue([mockDataSourceWithConfig]);

      // Act
      const result = await getEnabledScripts(mockDb);

      // Assert
      expect(result.size).toBe(2);

      const entries = Array.from(result.entries());
      expect(entries[0][0].dataSourceName).toBe("GITHUB");
      expect(entries[0][1].id).toBe("ds-123");
      expect(entries[0][1].env).toEqual({ GITHUB_TOKEN: "ghp_abc123" });
    });

    it("should return empty map when no data sources are enabled", async () => {
      // Arrange
      vi.mocked(mockDb.dataSource.findMany).mockResolvedValue([]);

      // Act
      const result = await getEnabledScripts(mockDb);

      // Assert
      expect(result.size).toBe(0);
    });

    it("should include environment variables from configs", async () => {
      // Arrange
      const dataSource: DataSourceWithConfig = {
        id: "ds-123",
        organizationId: "org-1",
        name: "GitHub - MyOrg",
        provider: "GITHUB",
        description: null,
        isEnabled: true,
        syncIntervalMinutes: 15,
        lastSyncAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        configs: [
          {
            id: "config-1",
            dataSourceId: "ds-123",
            key: "GITHUB_TOKEN",
            value: "ghp_abc123",
            isSecret: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          {
            id: "config-2",
            dataSourceId: "ds-123",
            key: "GITHUB_ORG",
            value: "my-org",
            isSecret: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };

      vi.mocked(mockDb.dataSource.findMany).mockResolvedValue([dataSource]);

      // Act
      const result = await getEnabledScripts(mockDb);

      // Assert
      const entries = Array.from(result.entries());
      expect(entries[0][1].env).toEqual({
        GITHUB_TOKEN: "ghp_abc123",
        GITHUB_ORG: "my-org",
      });
    });

    it("should load GitLab scripts when GitLab data source is enabled", async () => {
      // Arrange
      const gitlabDataSource: DataSourceWithConfig = {
        id: "ds-456",
        organizationId: "org-1",
        name: "GitLab - MyOrg",
        provider: "GITLAB",
        description: null,
        isEnabled: true,
        syncIntervalMinutes: 15,
        lastSyncAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        configs: [
          { id: "config-1", dataSourceId: "ds-456", key: "GITLAB_TOKEN", value: "glpat_abc123", isSecret: true, createdAt: new Date(), updatedAt: new Date() },
          { id: "config-2", dataSourceId: "ds-456", key: "GITLAB_GROUP", value: "my-group", isSecret: false, createdAt: new Date(), updatedAt: new Date() },
        ],
      };

      vi.mocked(mockDb.dataSource.findMany).mockResolvedValue([gitlabDataSource]);

      // Act
      const result = await getEnabledScripts(mockDb);

      // Assert
      expect(result.size).toBe(8);
      const scripts = Array.from(result.keys());
      expect(scripts.every((s) => s.dataSourceName === "GITLAB")).toBe(true);
    });
  });
});
