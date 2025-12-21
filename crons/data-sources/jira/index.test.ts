import { describe, expect, it } from "vitest";
import { scripts } from "./index.js";

describe("Jira scripts", () => {
  it("should export all scripts", () => {
    expect(scripts).toHaveLength(5);
  });

  it("should have correct script names", () => {
    const scriptNames = scripts.map((s) => s.resource);
    expect(scriptNames).toContain("project");
    expect(scriptNames).toContain("board");
    expect(scriptNames).toContain("sprint");
    expect(scriptNames).toContain("issue");
    expect(scriptNames).toContain("status-transition");
  });

  it("should all have JIRA as data source name", () => {
    for (const script of scripts) {
      expect(script.dataSourceName).toBe("JIRA");
    }
  });

  it("should all have run functions", () => {
    for (const script of scripts) {
      expect(typeof script.run).toBe("function");
    }
  });

  it("should have correct dependency chain", () => {
    const projectScript = scripts.find((s) => s.resource === "project");
    const boardScript = scripts.find((s) => s.resource === "board");
    const sprintScript = scripts.find((s) => s.resource === "sprint");
    const issueScript = scripts.find((s) => s.resource === "issue");
    const transitionScript = scripts.find((s) => s.resource === "status-transition");

    expect(projectScript?.dependsOn).toEqual([]);
    expect(boardScript?.dependsOn).toContain("project");
    expect(sprintScript?.dependsOn).toContain("project");
    expect(sprintScript?.dependsOn).toContain("board");
    expect(issueScript?.dependsOn).toContain("project");
    expect(transitionScript?.dependsOn).toContain("project");
    expect(transitionScript?.dependsOn).toContain("issue");
  });
});
