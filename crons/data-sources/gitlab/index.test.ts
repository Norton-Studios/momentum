import { describe, expect, it } from "vitest";
import { scripts } from "./index.js";

describe("gitlab scripts", () => {
  it("should export all gitlab scripts", () => {
    expect(scripts).toHaveLength(8);
  });

  it("should export scripts in correct dependency order", () => {
    const scriptNames = scripts.map((s) => s.resource);
    expect(scriptNames).toEqual(["repository", "contributor", "project", "commit", "pull-request", "issue", "pipeline", "pipeline-run"]);
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

  it("should have project script depending on repository", () => {
    const projectScript = scripts.find((s) => s.resource === "project");
    expect(projectScript?.dependsOn).toEqual(["repository"]);
  });

  it("should have commit script depending on repository and contributor", () => {
    const commitScript = scripts.find((s) => s.resource === "commit");
    expect(commitScript?.dependsOn).toEqual(["repository", "contributor"]);
  });

  it("should have pull-request script depending on repository and contributor", () => {
    const pullRequestScript = scripts.find((s) => s.resource === "pull-request");
    expect(pullRequestScript?.dependsOn).toEqual(["repository", "contributor"]);
  });

  it("should have issue script depending on repository, contributor, and project", () => {
    const issueScript = scripts.find((s) => s.resource === "issue");
    expect(issueScript?.dependsOn).toEqual(["repository", "contributor", "project"]);
  });

  it("should have pipeline script depending on repository", () => {
    const pipelineScript = scripts.find((s) => s.resource === "pipeline");
    expect(pipelineScript?.dependsOn).toEqual(["repository"]);
  });

  it("should have pipeline-run script depending on repository and pipeline", () => {
    const pipelineRunScript = scripts.find((s) => s.resource === "pipeline-run");
    expect(pipelineRunScript?.dependsOn).toEqual(["repository", "pipeline"]);
  });
});
