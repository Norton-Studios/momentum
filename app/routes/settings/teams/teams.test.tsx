import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Teams, { meta } from "./teams";

const mockTeamsData = {
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
  user: { name: "Test User", email: "test@example.com" },
};

const mockEmptyTeamsData = {
  teams: [],
  user: { name: "Test User", email: "test@example.com" },
};

const mockLoaderData = mockTeamsData;
let mockActionData: { errors?: { form?: string; name?: string; description?: string } } | undefined;

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useActionData: () => mockActionData,
    useLoaderData: () => mockLoaderData,
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

  it("displays repository and project counts for each team", () => {
    render(
      <MemoryRouter>
        <Teams />
      </MemoryRouter>
    );

    const rows = screen.getAllByRole("row");
    const frontendRow = rows.find((row) => row.textContent?.includes("Frontend Team"));
    const backendRow = rows.find((row) => row.textContent?.includes("Backend Team"));

    expect(frontendRow).toBeDefined();
    expect(backendRow).toBeDefined();

    if (!frontendRow || !backendRow) return;

    const frontendCells = frontendRow.querySelectorAll("td");
    expect(frontendCells[2].textContent).toBe("5");
    expect(frontendCells[3].textContent).toBe("2");

    const backendCells = backendRow.querySelectorAll("td");
    expect(backendCells[2].textContent).toBe("3");
    expect(backendCells[3].textContent).toBe("1");
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

  it("shows create team form when create button is clicked", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Teams />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: "Create Team" }));

    expect(screen.getByRole("heading", { name: "Create New Team" })).toBeInTheDocument();
    expect(screen.getByLabelText("Team Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toBeInTheDocument();
  });

  it("closes create team form when close button is clicked", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Teams />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: "Create Team" }));
    expect(screen.getByRole("heading", { name: "Create New Team" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "✕" }));
    expect(screen.queryByRole("heading", { name: "Create New Team" })).not.toBeInTheDocument();
  });

  it("closes create team form when cancel button is clicked", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Teams />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: "Create Team" }));
    expect(screen.getByRole("heading", { name: "Create New Team" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("heading", { name: "Create New Team" })).not.toBeInTheDocument();
  });

  it("shows delete confirmation when delete button is clicked", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Teams />
      </MemoryRouter>
    );

    const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
    await user.click(deleteButtons[0]);

    expect(screen.getByText("Delete?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Yes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "No" })).toBeInTheDocument();
  });

  it("cancels delete when No button is clicked", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Teams />
      </MemoryRouter>
    );

    const deleteButtons = screen.getAllByRole("button", { name: "Delete" });
    await user.click(deleteButtons[0]);

    expect(screen.getByText("Delete?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "No" }));

    expect(screen.queryByText("Delete?")).not.toBeInTheDocument();
    const remainingDeleteButtons = screen.getAllByRole("button", { name: "Delete" });
    expect(remainingDeleteButtons).toHaveLength(2);
  });
});

describe("Teams empty state", () => {
  beforeEach(() => {
    vi.doMock("react-router", async () => {
      const actual = await vi.importActual("react-router");
      return {
        ...actual,
        useActionData: () => undefined,
        useLoaderData: () => mockEmptyTeamsData,
        Form: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => <form {...props}>{children}</form>,
      };
    });
  });

  it("displays empty state with create button when no teams exist", async () => {
    vi.resetModules();
    const TeamsModule = await import("./teams");

    render(
      <MemoryRouter>
        <TeamsModule.default />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "No teams yet" })).toBeInTheDocument();
    expect(screen.getByText("Create your first team to organize repositories and projects")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Your First Team" })).toBeInTheDocument();
  });
});

describe("Teams with action errors", () => {
  beforeEach(() => {
    mockActionData = { errors: { name: "Team name is required", form: "Failed to create team" } };
  });

  afterEach(() => {
    mockActionData = undefined;
  });

  it("displays form error banner when form error exists", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Teams />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: "Create Team" }));

    expect(screen.getByText("Failed to create team")).toBeInTheDocument();
  });

  it("displays field error when name error exists", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <Teams />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: "Create Team" }));

    expect(screen.getByText("Team name is required")).toBeInTheDocument();
  });
});
