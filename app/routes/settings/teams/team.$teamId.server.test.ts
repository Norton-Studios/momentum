import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    data: (body: unknown, init?: ResponseInit) => new Response(JSON.stringify(body), { ...init, headers: { "Content-Type": "application/json" } }),
    redirect: (url: string) => new Response(null, { status: 302, headers: { Location: url } }),
  };
});

vi.mock("~/auth/auth.server", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("~/db.server", () => ({
  db: {
    team: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    repository: {
      findMany: vi.fn(),
    },
    project: {
      findMany: vi.fn(),
    },
    teamRepository: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    teamProject: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { requireAdmin } from "~/auth/auth.server";
import { db } from "~/db.server";
import { teamDetailAction, teamDetailLoader } from "./team.$teamId.server";

const mockRequest = (formData?: FormData) => {
  return new Request("http://localhost:3000/settings/teams/team-1", {
    method: formData ? "POST" : "GET",
    body: formData,
  });
};

describe("teamDetailLoader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({
      id: "user-1",
      email: "admin@test.com",
      name: "Admin User",
      role: "ADMIN",
    } as never);
  });

  it("returns team with repositories and projects", async () => {
    vi.mocked(db.team.findUnique).mockResolvedValue({
      id: "team-1",
      name: "Frontend Team",
      description: "Manages frontend",
      repositories: [],
      projects: [],
    } as never);
    vi.mocked(db.repository.findMany).mockResolvedValue([]);
    vi.mocked(db.project.findMany).mockResolvedValue([]);

    const request = mockRequest();
    const result = await teamDetailLoader({
      request,
      params: { teamId: "team-1" },
      context: {},
    } as never);

    expect(result.team).not.toBeNull();
    expect(result.team.name).toBe("Frontend Team");
    expect(result.team.repositories).toEqual([]);
    expect(result.team.projects).toEqual([]);
  });

  it("returns all enabled repositories", async () => {
    vi.mocked(db.team.findUnique).mockResolvedValue({
      id: "team-1",
      name: "Team",
      repositories: [],
      projects: [],
    } as never);
    vi.mocked(db.repository.findMany).mockResolvedValue([{ id: "repo-1", name: "repo-1", fullName: "org/repo-1", description: null }] as never);
    vi.mocked(db.project.findMany).mockResolvedValue([]);

    const request = mockRequest();
    const result = await teamDetailLoader({
      request,
      params: { teamId: "team-1" },
      context: {},
    } as never);

    expect(result.allRepositories).toHaveLength(1);
    expect(result.allRepositories[0].name).toBe("repo-1");
  });

  it("returns all enabled projects", async () => {
    vi.mocked(db.team.findUnique).mockResolvedValue({
      id: "team-1",
      name: "Team",
      repositories: [],
      projects: [],
    } as never);
    vi.mocked(db.repository.findMany).mockResolvedValue([]);
    vi.mocked(db.project.findMany).mockResolvedValue([{ id: "proj-1", name: "Project 1", key: "P1", description: null }] as never);

    const request = mockRequest();
    const result = await teamDetailLoader({
      request,
      params: { teamId: "team-1" },
      context: {},
    } as never);

    expect(result.allProjects).toHaveLength(1);
    expect(result.allProjects[0].name).toBe("Project 1");
  });

  it("throws 404 when team not found", async () => {
    vi.mocked(db.team.findUnique).mockResolvedValue(null);
    vi.mocked(db.repository.findMany).mockResolvedValue([]);
    vi.mocked(db.project.findMany).mockResolvedValue([]);

    const request = mockRequest();

    try {
      await teamDetailLoader({
        request,
        params: { teamId: "non-existent" },
        context: {},
      } as never);
      expect.fail("Expected to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(Response);
      expect((error as Response).status).toBe(404);
    }
  });
});

describe("teamDetailAction - update-team", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({
      id: "user-1",
      email: "admin@test.com",
      name: "Admin User",
      role: "ADMIN",
    } as never);
  });

  it("updates team name and description", async () => {
    vi.mocked(db.team.update).mockResolvedValue({
      id: "team-1",
      name: "New Name",
      description: "New description",
    } as never);

    const formData = new FormData();
    formData.append("intent", "update-team");
    formData.append("name", "New Name");
    formData.append("description", "New description");

    const request = mockRequest(formData);
    await teamDetailAction({
      request,
      params: { teamId: "team-1" },
      context: {},
    } as never);

    expect(db.team.update).toHaveBeenCalledWith({
      where: { id: "team-1" },
      data: {
        name: "New Name",
        description: "New description",
      },
    });
  });

  it("sets description to null when empty", async () => {
    vi.mocked(db.team.update).mockResolvedValue({
      id: "team-1",
      name: "Team",
      description: null,
    } as never);

    const formData = new FormData();
    formData.append("intent", "update-team");
    formData.append("name", "Team");
    formData.append("description", "");

    const request = mockRequest(formData);
    await teamDetailAction({
      request,
      params: { teamId: "team-1" },
      context: {},
    } as never);

    expect(db.team.update).toHaveBeenCalledWith({
      where: { id: "team-1" },
      data: {
        name: "Team",
        description: null,
      },
    });
  });

  it("returns error when name is missing", async () => {
    const formData = new FormData();
    formData.append("intent", "update-team");
    formData.append("name", "");

    const request = mockRequest(formData);
    const result = await teamDetailAction({
      request,
      params: { teamId: "team-1" },
      context: {},
    } as never);

    if (!result) {
      throw new Error("Expected response");
    }

    const response = result as Response;
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.errors.name).toBe("Team name is required");
    expect(db.team.update).not.toHaveBeenCalled();
  });
});

describe("teamDetailAction - toggle-repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({
      id: "user-1",
      email: "admin@test.com",
      name: "Admin User",
      role: "ADMIN",
    } as never);
  });

  it("adds repository to team", async () => {
    vi.mocked(db.teamRepository.create).mockResolvedValue({
      id: "tr-1",
      teamId: "team-1",
      repositoryId: "repo-1",
    } as never);

    const formData = new FormData();
    formData.append("intent", "toggle-repository");
    formData.append("repositoryId", "repo-1");
    formData.append("isSelected", "true");

    const request = mockRequest(formData);
    await teamDetailAction({
      request,
      params: { teamId: "team-1" },
      context: {},
    } as never);

    expect(db.teamRepository.create).toHaveBeenCalledWith({
      data: {
        teamId: "team-1",
        repositoryId: "repo-1",
      },
    });
  });

  it("removes repository from team", async () => {
    vi.mocked(db.teamRepository.deleteMany).mockResolvedValue({ count: 1 } as never);

    const formData = new FormData();
    formData.append("intent", "toggle-repository");
    formData.append("repositoryId", "repo-1");
    formData.append("isSelected", "false");

    const request = mockRequest(formData);
    await teamDetailAction({
      request,
      params: { teamId: "team-1" },
      context: {},
    } as never);

    expect(db.teamRepository.deleteMany).toHaveBeenCalledWith({
      where: {
        teamId: "team-1",
        repositoryId: "repo-1",
      },
    });
  });

  it("returns error when repositoryId is missing", async () => {
    const formData = new FormData();
    formData.append("intent", "toggle-repository");
    formData.append("repositoryId", "");
    formData.append("isSelected", "true");

    const request = mockRequest(formData);
    const result = await teamDetailAction({
      request,
      params: { teamId: "team-1" },
      context: {},
    } as never);

    if (!result) {
      throw new Error("Expected response");
    }

    const response = result as Response;
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.errors.form).toBe("Repository ID is required");
    expect(db.teamRepository.create).not.toHaveBeenCalled();
  });
});

describe("teamDetailAction - toggle-project", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({
      id: "user-1",
      email: "admin@test.com",
      name: "Admin User",
      role: "ADMIN",
    } as never);
  });

  it("adds project to team", async () => {
    vi.mocked(db.teamProject.create).mockResolvedValue({
      id: "tp-1",
      teamId: "team-1",
      projectId: "proj-1",
    } as never);

    const formData = new FormData();
    formData.append("intent", "toggle-project");
    formData.append("projectId", "proj-1");
    formData.append("isSelected", "true");

    const request = mockRequest(formData);
    await teamDetailAction({
      request,
      params: { teamId: "team-1" },
      context: {},
    } as never);

    expect(db.teamProject.create).toHaveBeenCalledWith({
      data: {
        teamId: "team-1",
        projectId: "proj-1",
      },
    });
  });

  it("removes project from team", async () => {
    vi.mocked(db.teamProject.deleteMany).mockResolvedValue({ count: 1 } as never);

    const formData = new FormData();
    formData.append("intent", "toggle-project");
    formData.append("projectId", "proj-1");
    formData.append("isSelected", "false");

    const request = mockRequest(formData);
    await teamDetailAction({
      request,
      params: { teamId: "team-1" },
      context: {},
    } as never);

    expect(db.teamProject.deleteMany).toHaveBeenCalledWith({
      where: {
        teamId: "team-1",
        projectId: "proj-1",
      },
    });
  });

  it("returns error when projectId is missing", async () => {
    const formData = new FormData();
    formData.append("intent", "toggle-project");
    formData.append("projectId", "");
    formData.append("isSelected", "true");

    const request = mockRequest(formData);
    const result = await teamDetailAction({
      request,
      params: { teamId: "team-1" },
      context: {},
    } as never);

    if (!result) {
      throw new Error("Expected response");
    }

    const response = result as Response;
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.errors.form).toBe("Project ID is required");
    expect(db.teamProject.create).not.toHaveBeenCalled();
  });
});
