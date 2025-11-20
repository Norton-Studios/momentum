import { beforeEach, describe, expect, it, vi } from "vitest";
import { commitScript } from "./commit.js";

// Mock Octokit
vi.mock("@octokit/rest", () => {
  const Octokit = vi.fn();
  return { Octokit };
});

describe("commitScript", () => {
  beforeEach(() => {
    // Setup would go here if needed
  });

  it("should have correct configuration", () => {
    expect(commitScript.dataSourceName).toBe("GITHUB");
    expect(commitScript.resource).toBe("commit");
    expect(commitScript.dependsOn).toEqual(["repository", "contributor"]);
    expect(commitScript.importWindowDays).toBe(90);
  });

  it("should have a run function", () => {
    expect(typeof commitScript.run).toBe("function");
  });
});
