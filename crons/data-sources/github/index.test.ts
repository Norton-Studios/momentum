import { describe, expect, it } from "vitest";
import { scripts } from "./index.js";

describe("GitHub data source scripts", () => {
  it("should export an array of scripts", () => {
    expect(Array.isArray(scripts)).toBe(true);
    expect(scripts.length).toBeGreaterThan(0);
  });

  it("should contain repository script", () => {
    const repositoryScript = scripts.find((s) => s.resource === "repository");
    expect(repositoryScript).toBeDefined();
    expect(repositoryScript?.dataSourceName).toBe("GITHUB");
  });

  it("should contain contributor script", () => {
    const contributorScript = scripts.find((s) => s.resource === "contributor");
    expect(contributorScript).toBeDefined();
    expect(contributorScript?.dataSourceName).toBe("GITHUB");
  });

  it("should contain commit script", () => {
    const commitScript = scripts.find((s) => s.resource === "commit");
    expect(commitScript).toBeDefined();
    expect(commitScript?.dataSourceName).toBe("GITHUB");
  });

  it("should contain pull-request script", () => {
    const pullRequestScript = scripts.find((s) => s.resource === "pull-request");
    expect(pullRequestScript).toBeDefined();
    expect(pullRequestScript?.dataSourceName).toBe("GITHUB");
  });

  it("should contain pull-request-review script", () => {
    const pullRequestReviewScript = scripts.find((s) => s.resource === "pull-request-review");
    expect(pullRequestReviewScript).toBeDefined();
    expect(pullRequestReviewScript?.dataSourceName).toBe("GITHUB");
    expect(pullRequestReviewScript?.dependsOn).toContain("pull-request");
  });

  it("should have all scripts with run functions", () => {
    for (const script of scripts) {
      expect(typeof script.run).toBe("function");
    }
  });
});
