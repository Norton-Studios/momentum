import { beforeEach, describe, expect, it, vi } from "vitest";
import { createJiraClient, formatJiraDate } from "./client.js";

const mockFetch = vi.fn();

vi.stubGlobal("fetch", mockFetch);

describe("createJiraClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Cloud configuration", () => {
    const cloudEnv = {
      JIRA_VARIANT: "cloud",
      JIRA_DOMAIN: "mycompany",
      JIRA_EMAIL: "user@example.com",
      JIRA_API_TOKEN: "api-token-123",
    };

    it("should create a client with Cloud base URL", () => {
      const client = createJiraClient(cloudEnv);
      expect(client.baseUrl).toBe("https://mycompany.atlassian.net");
    });

    it("should use API v3 for Cloud", () => {
      const client = createJiraClient(cloudEnv);
      expect(client.apiVersion).toBe("3");
    });

    it("should use Basic auth for Cloud", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accountId: "123", displayName: "Test User" }),
      });

      const client = createJiraClient(cloudEnv);
      await client.getMyself();

      expect(mockFetch).toHaveBeenCalledWith(
        "https://mycompany.atlassian.net/rest/api/3/myself",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringMatching(/^Basic /),
          }),
        })
      );
    });
  });

  describe("Data Center configuration", () => {
    const dcEnv = {
      JIRA_VARIANT: "datacenter",
      JIRA_SERVER_URL: "https://jira.company.com/",
      JIRA_PAT: "personal-access-token-123",
    };

    it("should create a client with Data Center base URL (trimming trailing slash)", () => {
      const client = createJiraClient(dcEnv);
      expect(client.baseUrl).toBe("https://jira.company.com");
    });

    it("should use API v2 for Data Center", () => {
      const client = createJiraClient(dcEnv);
      expect(client.apiVersion).toBe("2");
    });

    it("should use Bearer auth for Data Center", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ name: "testuser", displayName: "Test User" }),
      });

      const client = createJiraClient(dcEnv);
      await client.getMyself();

      expect(mockFetch).toHaveBeenCalledWith(
        "https://jira.company.com/rest/api/2/myself",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer personal-access-token-123",
          }),
        })
      );
    });
  });

  describe("API methods", () => {
    const cloudEnv = {
      JIRA_VARIANT: "cloud",
      JIRA_DOMAIN: "test",
      JIRA_EMAIL: "user@test.com",
      JIRA_API_TOKEN: "token",
    };

    it("getMyself should call /myself endpoint", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accountId: "123" }),
      });

      const client = createJiraClient(cloudEnv);
      const result = await client.getMyself();

      expect(result.accountId).toBe("123");
      expect(mockFetch).toHaveBeenCalledWith("https://test.atlassian.net/rest/api/3/myself", expect.any(Object));
    });

    it("getProjects should call /project/search endpoint for Cloud", async () => {
      const mockProjects = [{ id: "10001", key: "PROJ", name: "Test Project" }];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          values: mockProjects,
          isLast: true,
          total: 1,
        }),
      });

      const client = createJiraClient(cloudEnv);
      const result = await client.getProjects();

      expect(result).toEqual(mockProjects);
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/rest/api/3/project/search"), expect.any(Object));
    });

    it("getBoards should return all boards", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          values: [
            { id: 1, name: "Board 1" },
            { id: 2, name: "Board 2" },
          ],
          isLast: true,
          total: 2,
        }),
      });

      const client = createJiraClient(cloudEnv);
      const result = await client.getBoards("PROJ");

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Board 1");
      expect(result[1].name).toBe("Board 2");
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/rest/agile/1.0/board"), expect.any(Object));
    });

    it("searchIssues should call search endpoint with JQL", async () => {
      const mockResponse = {
        issues: [{ id: "10001", key: "PROJ-1" }],
        startAt: 0,
        maxResults: 100,
        total: 1,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const client = createJiraClient(cloudEnv);
      const jql = 'project = "PROJ"';
      const result = await client.searchIssues(jql, ["summary"]);

      expect(result.issues).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://test.atlassian.net/rest/api/3/search",
        expect.objectContaining({
          method: "POST",
        })
      );
      const callArgs = mockFetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.jql).toBe(jql);
    });

    it("should handle API errors gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => "Unauthorized",
      });

      const client = createJiraClient(cloudEnv);

      await expect(client.getMyself()).rejects.toThrow("Jira API error:");
    });
  });
});

describe("formatJiraDate", () => {
  it("should format date in Jira format", () => {
    const date = new Date("2024-01-15T10:30:00Z");
    const formatted = formatJiraDate(date);
    expect(formatted).toBe("2024-01-15");
  });

  it("should handle dates at month boundaries", () => {
    const date = new Date("2024-12-31T23:59:59Z");
    const formatted = formatJiraDate(date);
    expect(formatted).toBe("2024-12-31");
  });
});
