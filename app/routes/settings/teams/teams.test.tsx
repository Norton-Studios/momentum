import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import Teams, { meta } from "./teams";

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useActionData: () => undefined,
    useLoaderData: () => ({
      teams: [
        {
          id: "team-1",
          name: "Frontend Team",
          description: "Manages frontend repositories",
          _count: {
            repositories: 5,
            projects: 2,
          },
        },
        {
          id: "team-2",
          name: "Backend Team",
          description: null,
          _count: {
            repositories: 3,
            projects: 1,
          },
        },
      ],
    }),
    Form: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => <form {...props}>{children}</form>,
  };
});

describe("Teams meta", () => {
  it("exports correct title and description meta tags", () => {
    const metaTags = meta();

    expect(metaTags).toEqual([
      { title: "Teams - Settings - Momentum" },
      {
        name: "description",
        content: "Manage teams and assign repositories and projects",
      },
    ]);
  });
});

describe("Teams", () => {
  it("renders header with create button", () => {
    render(
      <MemoryRouter>
        <Teams />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { level: 2, name: "Teams" })).toBeInTheDocument();
    expect(screen.getByText("Organize your work by creating teams and assigning repositories and projects")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Team" })).toBeInTheDocument();
  });

  it("renders teams table with team data", () => {
    render(
      <MemoryRouter>
        <Teams />
      </MemoryRouter>
    );

    expect(screen.getByText("Frontend Team")).toBeInTheDocument();
    expect(screen.getByText("Manages frontend repositories")).toBeInTheDocument();
    expect(screen.getByText("Backend Team")).toBeInTheDocument();
  });

  it("displays repository and project counts", () => {
    render(
      <MemoryRouter>
        <Teams />
      </MemoryRouter>
    );

    const table = screen.getByRole("table");
    expect(table).toBeInTheDocument();

    const rows = screen.getAllByRole("row");
    expect(rows.length).toBeGreaterThan(2);
  });

  it("displays no description when description is null", () => {
    render(
      <MemoryRouter>
        <Teams />
      </MemoryRouter>
    );

    expect(screen.getByText("No description")).toBeInTheDocument();
  });

  it("renders delete buttons for each team", () => {
    render(
      <MemoryRouter>
        <Teams />
      </MemoryRouter>
    );

    const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
    expect(deleteButtons).toHaveLength(2);
  });
});
