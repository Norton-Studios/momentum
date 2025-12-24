import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSonarQubeClient, SonarQubeApiError } from "./client.js";

const mockFetch = vi.fn();

vi.stubGlobal("fetch", mockFetch);

describe("createSonarQubeClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Cloud configuration", () => {
    const cloudEnv = {
      SONARQUBE_VARIANT: "cloud",
      SONARQUBE_ORGANIZATION: "my-org",
      SONARQUBE_TOKEN_CLOUD: "cloud-token-123",
    };

    it("should create a client with SonarCloud base URL", () => {
      const client = createSonarQubeClient(cloudEnv);
      expect(client.baseUrl).toBe("https://sonarcloud.io");
    });

    it("should set organization for Cloud", () => {
      const client = createSonarQubeClient(cloudEnv);
      expect(client.organization).toBe("my-org");
    });

    it("should use Basic auth with token as username", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ valid: true }),
      });

      const client = createSonarQubeClient(cloudEnv);
      await client.request("/api/authentication/validate");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://sonarcloud.io/api/authentication/validate",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringMatching(/^Basic /),
          }),
        })
      );
    });

    it("should throw if organization is missing", () => {
      const invalidEnv = {
        SONARQUBE_VARIANT: "cloud",
        SONARQUBE_TOKEN_CLOUD: "token",
      };
      expect(() => createSonarQubeClient(invalidEnv)).toThrow("SONARQUBE_ORGANIZATION is required");
    });

    it("should throw if token is missing", () => {
      const invalidEnv = {
        SONARQUBE_VARIANT: "cloud",
        SONARQUBE_ORGANIZATION: "my-org",
      };
      expect(() => createSonarQubeClient(invalidEnv)).toThrow("SONARQUBE_TOKEN_CLOUD is required");
    });
  });

  describe("Self-hosted configuration", () => {
    const selfHostedEnv = {
      SONARQUBE_VARIANT: "selfhosted",
      SONARQUBE_URL: "https://sonarqube.example.com/",
      SONARQUBE_TOKEN: "self-hosted-token-123",
    };

    it("should create a client with self-hosted URL (trimming trailing slash)", () => {
      const client = createSonarQubeClient(selfHostedEnv);
      expect(client.baseUrl).toBe("https://sonarqube.example.com");
    });

    it("should not set organization for self-hosted", () => {
      const client = createSonarQubeClient(selfHostedEnv);
      expect(client.organization).toBeUndefined();
    });

    it("should throw if URL is missing", () => {
      const invalidEnv = {
        SONARQUBE_VARIANT: "selfhosted",
        SONARQUBE_TOKEN: "token",
      };
      expect(() => createSonarQubeClient(invalidEnv)).toThrow("SONARQUBE_URL is required");
    });

    it("should throw if token is missing", () => {
      const invalidEnv = {
        SONARQUBE_VARIANT: "selfhosted",
        SONARQUBE_URL: "https://sonarqube.example.com",
      };
      expect(() => createSonarQubeClient(invalidEnv)).toThrow("SONARQUBE_TOKEN is required");
    });
  });

  describe("Invalid configuration", () => {
    it("should throw for invalid variant", () => {
      const invalidEnv = {
        SONARQUBE_VARIANT: "invalid",
      };
      expect(() => createSonarQubeClient(invalidEnv)).toThrow("Invalid SONARQUBE_VARIANT");
    });
  });

  describe("API methods", () => {
    const cloudEnv = {
      SONARQUBE_VARIANT: "cloud",
      SONARQUBE_ORGANIZATION: "test-org",
      SONARQUBE_TOKEN_CLOUD: "token",
    };

    describe("getProjects", () => {
      it("should fetch all projects with organization param for Cloud", async () => {
        const mockProjects = [
          { key: "project-1", name: "Project 1", qualifier: "TRK" },
          { key: "project-2", name: "Project 2", qualifier: "TRK" },
        ];

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            paging: { pageIndex: 1, pageSize: 100, total: 2 },
            components: mockProjects,
          }),
        });

        const client = createSonarQubeClient(cloudEnv);
        const result = await client.getProjects();

        expect(result).toEqual(mockProjects);
        expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/api/components/search"), expect.any(Object));
        expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("organization=test-org"), expect.any(Object));
      });

      it("should paginate through all projects", async () => {
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              paging: { pageIndex: 1, pageSize: 100, total: 2 },
              components: [{ key: "project-1", name: "Project 1", qualifier: "TRK" }],
            }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              paging: { pageIndex: 2, pageSize: 100, total: 2 },
              components: [{ key: "project-2", name: "Project 2", qualifier: "TRK" }],
            }),
          });

        const client = createSonarQubeClient(cloudEnv);
        const result = await client.getProjects();

        expect(result).toHaveLength(2);
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });

    describe("getProjectMeasures", () => {
      it("should fetch measures for a project", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            component: {
              key: "project-1",
              name: "Project 1",
              measures: [
                { metric: "coverage", value: "85.5" },
                { metric: "bugs", value: "10" },
                { metric: "code_smells", value: "42" },
              ],
            },
          }),
        });

        const client = createSonarQubeClient(cloudEnv);
        const result = await client.getProjectMeasures("project-1");

        expect(result.coverage).toBe("85.5");
        expect(result.bugs).toBe("10");
        expect(result.code_smells).toBe("42");
        expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/api/measures/component"), expect.any(Object));
      });
    });

    describe("getProjectAnalyses", () => {
      it("should fetch analyses for a project", async () => {
        const mockAnalyses = [
          { key: "AWx123", date: "2024-01-15T10:00:00+0000", revision: "abc123" },
          { key: "AWx456", date: "2024-01-14T10:00:00+0000", revision: "def456" },
        ];

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            paging: { pageIndex: 1, pageSize: 100, total: 2 },
            analyses: mockAnalyses,
          }),
        });

        const client = createSonarQubeClient(cloudEnv);
        const result = await client.getProjectAnalyses("project-1");

        expect(result).toEqual(mockAnalyses);
        expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/api/project_analyses/search"), expect.any(Object));
      });

      it("should include from date when provided", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            paging: { pageIndex: 1, pageSize: 100, total: 0 },
            analyses: [],
          }),
        });

        const client = createSonarQubeClient(cloudEnv);
        await client.getProjectAnalyses("project-1", new Date("2024-01-01"));

        expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("from=2024-01-01"), expect.any(Object));
      });

      it("should paginate through all analyses", async () => {
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              paging: { pageIndex: 1, pageSize: 100, total: 2 },
              analyses: [{ key: "AWx123", date: "2024-01-15T10:00:00+0000" }],
            }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              paging: { pageIndex: 2, pageSize: 100, total: 2 },
              analyses: [{ key: "AWx456", date: "2024-01-14T10:00:00+0000" }],
            }),
          });

        const client = createSonarQubeClient(cloudEnv);
        const result = await client.getProjectAnalyses("project-1");

        expect(result).toHaveLength(2);
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });

    describe("getIssues", () => {
      it("should fetch issues with specified types", async () => {
        const mockIssues = [
          {
            key: "issue-1",
            rule: "java:S123",
            severity: "CRITICAL",
            component: "src/Main.java",
            project: "project-1",
            message: "Fix this vulnerability",
            status: "OPEN",
            type: "VULNERABILITY",
            creationDate: "2024-01-15T10:00:00+0000",
            updateDate: "2024-01-15T10:00:00+0000",
          },
        ];

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            paging: { pageIndex: 1, pageSize: 100, total: 1 },
            issues: mockIssues,
          }),
        });

        const client = createSonarQubeClient(cloudEnv);
        const result = await client.getIssues("project-1", ["VULNERABILITY"]);

        expect(result).toEqual(mockIssues);
        expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("/api/issues/search"), expect.any(Object));
        expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("types=VULNERABILITY"), expect.any(Object));
      });

      it("should include createdAfter date when provided", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            paging: { pageIndex: 1, pageSize: 100, total: 0 },
            issues: [],
          }),
        });

        const client = createSonarQubeClient(cloudEnv);
        await client.getIssues("project-1", ["VULNERABILITY"], new Date("2024-01-01"));

        expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("createdAfter=2024-01-01"), expect.any(Object));
      });

      it("should paginate through all issues", async () => {
        mockFetch
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              paging: { pageIndex: 1, pageSize: 100, total: 2 },
              issues: [
                {
                  key: "issue-1",
                  rule: "java:S123",
                  severity: "CRITICAL",
                  component: "src/Main.java",
                  project: "project-1",
                  message: "Fix",
                  status: "OPEN",
                  type: "VULNERABILITY",
                  creationDate: "2024-01-15",
                  updateDate: "2024-01-15",
                },
              ],
            }),
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              paging: { pageIndex: 2, pageSize: 100, total: 2 },
              issues: [
                {
                  key: "issue-2",
                  rule: "java:S456",
                  severity: "MAJOR",
                  component: "src/Other.java",
                  project: "project-1",
                  message: "Fix",
                  status: "OPEN",
                  type: "VULNERABILITY",
                  creationDate: "2024-01-14",
                  updateDate: "2024-01-14",
                },
              ],
            }),
          });

        const client = createSonarQubeClient(cloudEnv);
        const result = await client.getIssues("project-1", ["VULNERABILITY"]);

        expect(result).toHaveLength(2);
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });

    describe("Error handling", () => {
      it("should throw SonarQubeApiError on non-OK response", async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          statusText: "Unauthorized",
          text: async () => "Invalid token",
        });

        const client = createSonarQubeClient(cloudEnv);

        await expect(client.request("/api/authentication/validate")).rejects.toThrow(SonarQubeApiError);
        await mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          statusText: "Unauthorized",
          text: async () => "Invalid token",
        });
        await expect(client.request("/api/authentication/validate")).rejects.toThrow("SonarQube API error:");
      });
    });
  });
});
