import { beforeEach, describe, expect, it, vi } from "vitest";
import { repositoryScript } from "./repository.js";

// Mock Octokit
vi.mock("@octokit/rest", () => {
  const Octokit = vi.fn();
  return { Octokit };
});

describe("repositoryScript", () => {
  beforeEach(() => {
    // Setup would go here if needed
  });

  it("should have correct configuration", () => {
    expect(repositoryScript.dataSourceName).toBe("GITHUB");
    expect(repositoryScript.resource).toBe("repository");
    expect(repositoryScript.dependsOn).toEqual([]);
    expect(repositoryScript.importWindowDays).toBe(365);
  });

  it("should have a run function", () => {
    expect(typeof repositoryScript.run).toBe("function");
  });
});
