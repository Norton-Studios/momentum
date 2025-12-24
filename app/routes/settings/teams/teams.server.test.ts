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
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

import { requireAdmin } from "~/auth/auth.server";
import { db } from "~/db.server";
import { teamsAction, teamsLoader } from "./teams.server";

const mockRequest = (formData?: FormData) => {
  return new Request("http://localhost:3000/settings/teams", {
    method: formData ? "POST" : "GET",
    body: formData,
  });
};

describe("teamsLoader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({
      id: "user-1",
      email: "admin@test.com",
      name: "Admin User",
      role: "ADMIN",
    } as never);
  });

  it("returns teams with repository and project counts", async () => {
    vi.mocked(db.team.findMany).mockResolvedValue([
      { id: "1", name: "Backend Team", description: null, _count: { repositories: 0, projects: 0 } },
      { id: "2", name: "Frontend Team", description: "Manages frontend repositories", _count: { repositories: 0, projects: 0 } },
    ] as never);

    const request = mockRequest();
    const result = await teamsLoader({ request, params: {}, context: {} } as never);

    expect(result.teams).toHaveLength(2);
    expect(result.teams[0].name).toBe("Backend Team");
    expect(result.teams[1].name).toBe("Frontend Team");
    expect(result.teams[0]._count.repositories).toBe(0);
    expect(result.teams[0]._count.projects).toBe(0);
  });

  it("returns teams ordered by name", async () => {
    vi.mocked(db.team.findMany).mockResolvedValue([
      { id: "1", name: "Alpha Team", description: null, _count: { repositories: 0, projects: 0 } },
      { id: "2", name: "Zebra Team", description: null, _count: { repositories: 0, projects: 0 } },
    ] as never);

    const request = mockRequest();
    const result = await teamsLoader({ request, params: {}, context: {} } as never);

    expect(result.teams[0].name).toBe("Alpha Team");
    expect(result.teams[1].name).toBe("Zebra Team");
  });
});

describe("teamsAction - create-team", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({
      id: "user-1",
      email: "admin@test.com",
      name: "Admin User",
      role: "ADMIN",
    } as never);
  });

  it("creates team with name and description", async () => {
    vi.mocked(db.team.create).mockResolvedValue({
      id: "team-1",
      name: "Frontend Team",
      description: "Manages frontend repositories",
    } as never);

    const formData = new FormData();
    formData.append("intent", "create-team");
    formData.append("name", "Frontend Team");
    formData.append("description", "Manages frontend repositories");

    const request = mockRequest(formData);
    const result = await teamsAction({ request, params: {}, context: {} } as never);

    expect(db.team.create).toHaveBeenCalledWith({
      data: {
        name: "Frontend Team",
        description: "Manages frontend repositories",
      },
    });
    expect((result as Response).status).toBe(302);
  });

  it("creates team with null description when empty", async () => {
    vi.mocked(db.team.create).mockResolvedValue({
      id: "team-1",
      name: "Backend Team",
      description: null,
    } as never);

    const formData = new FormData();
    formData.append("intent", "create-team");
    formData.append("name", "Backend Team");
    formData.append("description", "");

    const request = mockRequest(formData);
    await teamsAction({ request, params: {}, context: {} } as never);

    expect(db.team.create).toHaveBeenCalledWith({
      data: {
        name: "Backend Team",
        description: null,
      },
    });
  });

  it("returns error when name is missing", async () => {
    const formData = new FormData();
    formData.append("intent", "create-team");
    formData.append("name", "");

    const request = mockRequest(formData);
    const result = await teamsAction({ request, params: {}, context: {} } as never);

    const response = result as Response;
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.errors.name).toBe("Team name is required");
    expect(db.team.create).not.toHaveBeenCalled();
  });

  it("trims whitespace from name and description", async () => {
    vi.mocked(db.team.create).mockResolvedValue({
      id: "team-1",
      name: "Frontend Team",
      description: "Manages frontend",
    } as never);

    const formData = new FormData();
    formData.append("intent", "create-team");
    formData.append("name", "  Frontend Team  ");
    formData.append("description", "  Manages frontend  ");

    const request = mockRequest(formData);
    await teamsAction({ request, params: {}, context: {} } as never);

    expect(db.team.create).toHaveBeenCalledWith({
      data: {
        name: "Frontend Team",
        description: "Manages frontend",
      },
    });
  });
});

describe("teamsAction - delete-team", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({
      id: "user-1",
      email: "admin@test.com",
      name: "Admin User",
      role: "ADMIN",
    } as never);
  });

  it("deletes team by id", async () => {
    vi.mocked(db.team.delete).mockResolvedValue({
      id: "team-1",
      name: "Frontend Team",
    } as never);

    const formData = new FormData();
    formData.append("intent", "delete-team");
    formData.append("teamId", "team-1");

    const request = mockRequest(formData);
    const result = await teamsAction({ request, params: {}, context: {} } as never);

    expect(db.team.delete).toHaveBeenCalledWith({
      where: { id: "team-1" },
    });
    expect((result as Response).status).toBe(302);
  });

  it("returns error when teamId is missing", async () => {
    const formData = new FormData();
    formData.append("intent", "delete-team");
    formData.append("teamId", "");

    const request = mockRequest(formData);
    const result = await teamsAction({ request, params: {}, context: {} } as never);

    const response = result as Response;
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.errors.form).toBe("Team ID is required");
    expect(db.team.delete).not.toHaveBeenCalled();
  });
});
