import type { DataSource, DataSourceConfig, PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DataSourceScript } from "./script-loader.js";
import { buildEnvironment, getEnabledScripts } from "./script-loader.js";

type DataSourceWithConfig = DataSource & { configs: DataSourceConfig[] };

describe("script-loader", () => {
  describe("buildEnvironment", () => {
    it("should convert DataSourceConfig array to env object", () => {
      // Arrange
      const configs: DataSourceConfig[] = [
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
      ];

      // Act
      const result = buildEnvironment(configs);

      // Assert
      expect(result).toEqual({
        GITHUB_TOKEN: "ghp_abc123",
        GITHUB_ORG: "my-org",
      });
    });

    it("should return empty object for empty configs", () => {
      // Arrange
      const configs: DataSourceConfig[] = [];

      // Act
      const result = buildEnvironment(configs);

      // Assert
      expect(result).toEqual({});
    });
  });

  describe("getEnabledScripts", () => {
    let mockDb: PrismaClient;

    beforeEach(() => {
      mockDb = {
        dataSource: {
          findMany: vi.fn(),
        },
      } as unknown as PrismaClient;
    });

    it("should filter scripts by enabled data sources", async () => {
      // Arrange
      const allScripts: DataSourceScript[] = [
        {
          dataSourceName: "GITHUB",
          resource: "repository",
          dependsOn: [],
          importWindowDays: 365,
          run: vi.fn(),
        },
        {
          dataSourceName: "GITLAB",
          resource: "repository",
          dependsOn: [],
          importWindowDays: 365,
          run: vi.fn(),
        },
      ];

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
      const result = await getEnabledScripts(mockDb, allScripts);

      // Assert
      expect(result.scripts).toHaveLength(1);
      expect(result.scripts[0]?.dataSourceName).toBe("GITHUB");
      expect(result.dataSourceMap.size).toBe(1);
    });

    it("should return empty arrays when no data sources are enabled", async () => {
      // Arrange
      const allScripts: DataSourceScript[] = [
        {
          dataSourceName: "GITHUB",
          resource: "repository",
          dependsOn: [],
          importWindowDays: 365,
          run: vi.fn(),
        },
      ];

      vi.mocked(mockDb.dataSource.findMany).mockResolvedValue([]);

      // Act
      const result = await getEnabledScripts(mockDb, allScripts);

      // Assert
      expect(result.scripts).toHaveLength(0);
      expect(result.dataSourceMap.size).toBe(0);
    });

    it("should create correct dataSourceMap", async () => {
      // Arrange
      const githubScript: DataSourceScript = {
        dataSourceName: "GITHUB",
        resource: "repository",
        dependsOn: [],
        importWindowDays: 365,
        run: vi.fn(),
      };

      const allScripts: DataSourceScript[] = [githubScript];

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
        configs: [],
      };

      vi.mocked(mockDb.dataSource.findMany).mockResolvedValue([dataSource]);

      // Act
      const result = await getEnabledScripts(mockDb, allScripts);

      // Assert
      const mappedDataSource = result.dataSourceMap.get(githubScript);
      expect(mappedDataSource).toBeDefined();
      expect(mappedDataSource?.id).toBe("ds-123");
      expect(mappedDataSource?.provider).toBe("GITHUB");
    });
  });
});
