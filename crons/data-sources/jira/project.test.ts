import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { projectScript } from "./project.js";

const mockGetProjects = vi.fn();
const mockGetProjectsPaginated = vi.fn();

vi.mock("./client.js", () => ({
  createJiraClient: () => ({
    getProjects: mockGetProjects,
    getProjectsPaginated: mockGetProjectsPaginated,
    baseUrl: "https://test.atlassian.net",
  }),
}));

describe("projectScript", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have correct configuration", () => {
    expect(projectScript.dataSourceName).toBe("JIRA");
    expect(projectScript.resource).toBe("project");
    expect(projectScript.dependsOn).toEqual([]);
    expect(projectScript.importWindowDays).toBe(90);
  });

  it("should have a run function", () => {
    expect(typeof projectScript.run).toBe("function");
  });

  it("should fetch and store projects successfully", async () => {
    const mockProjects = [
      { id: "10001", key: "PROJ", name: "Test Project" },
      { id: "10002", key: "DEV", name: "Dev Project" },
    ];

    mockGetProjects.mockResolvedValue(mockProjects);

    const mockDb = {
      project: {
        upsert: vi.fn().mockResolvedValue({}),
      },
      dataSourceRun: {
        update: vi.fn().mockResolvedValue({}),
      },
    } as unknown as PrismaClient;

    const context = {
      id: "ds-123",
      provider: "JIRA",
      env: {
        JIRA_VARIANT: "cloud",
        JIRA_DOMAIN: "test",
        JIRA_EMAIL: "user@test.com",
        JIRA_API_TOKEN: "token",
      },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    await projectScript.run(mockDb, context as never);

    expect(mockGetProjects).toHaveBeenCalled();
    expect(mockDb.project.upsert).toHaveBeenCalledTimes(2);
    expect(mockDb.project.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: "PROJ" },
        create: expect.objectContaining({
          dataSourceId: "ds-123",
          key: "PROJ",
          name: "Test Project",
          externalId: "10001",
          provider: "JIRA",
          isEnabled: true,
        }),
      })
    );
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 2 },
    });
  });

  it("should handle empty project list", async () => {
    mockGetProjects.mockResolvedValue([]);

    const mockDb = {
      project: {
        upsert: vi.fn(),
      },
      dataSourceRun: {
        update: vi.fn().mockResolvedValue({}),
      },
    } as unknown as PrismaClient;

    const context = {
      id: "ds-123",
      provider: "JIRA",
      env: {
        JIRA_VARIANT: "cloud",
        JIRA_DOMAIN: "test",
        JIRA_EMAIL: "user@test.com",
        JIRA_API_TOKEN: "token",
      },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    await projectScript.run(mockDb, context as never);

    expect(mockDb.project.upsert).not.toHaveBeenCalled();
    expect(mockDb.dataSourceRun.update).toHaveBeenCalledWith({
      where: { id: "run-123" },
      data: { recordsImported: 0 },
    });
  });

  it("should set project URL correctly for Cloud", async () => {
    const mockProjects = [{ id: "10001", key: "PROJ", name: "Test Project" }];

    mockGetProjects.mockResolvedValue(mockProjects);

    const mockDb = {
      project: {
        upsert: vi.fn().mockResolvedValue({}),
      },
      dataSourceRun: {
        update: vi.fn().mockResolvedValue({}),
      },
    } as unknown as PrismaClient;

    const context = {
      id: "ds-123",
      provider: "JIRA",
      env: {
        JIRA_VARIANT: "cloud",
        JIRA_DOMAIN: "test",
        JIRA_EMAIL: "user@test.com",
        JIRA_API_TOKEN: "token",
      },
      startDate: new Date("2024-01-01"),
      endDate: new Date("2024-01-31"),
      runId: "run-123",
    };

    await projectScript.run(mockDb, context as never);

    expect(mockDb.project.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          url: "https://test.atlassian.net/browse/PROJ",
        }),
      })
    );
  });
});
