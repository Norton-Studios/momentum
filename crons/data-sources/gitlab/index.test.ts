import { describe, expect, it } from "vitest";
import { scripts } from "./index.js";

describe("gitlab scripts", () => {
  it("should export all gitlab scripts", () => {
    expect(scripts).toHaveLength(4);
  });

  it("should export scripts in correct dependency order", () => {
    const scriptNames = scripts.map((s) => s.resource);
    expect(scriptNames).toEqual(["repository", "contributor", "commit", "merge-request"]);
  });

  it("should have all scripts with GITLAB dataSourceName", () => {
    for (const script of scripts) {
      expect(script.dataSourceName).toBe("GITLAB");
    }
  });

  it("should have repository script with no dependencies", () => {
    const repositoryScript = scripts.find((s) => s.resource === "repository");
    expect(repositoryScript?.dependsOn).toEqual([]);
  });

  it("should have contributor script depending on repository", () => {
    const contributorScript = scripts.find((s) => s.resource === "contributor");
    expect(contributorScript?.dependsOn).toEqual(["repository"]);
  });

  it("should have commit script depending on repository and contributor", () => {
    const commitScript = scripts.find((s) => s.resource === "commit");
    expect(commitScript?.dependsOn).toEqual(["repository", "contributor"]);
  });

  it("should have merge-request script depending on repository and contributor", () => {
    const mergeRequestScript = scripts.find((s) => s.resource === "merge-request");
    expect(mergeRequestScript?.dependsOn).toEqual(["repository", "contributor"]);
  });
});
