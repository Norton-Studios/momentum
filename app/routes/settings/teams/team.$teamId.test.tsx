import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getTotalSize: () => count * 60,
    getVirtualItems: () =>
      Array.from({ length: count }, (_, i) => ({
        index: i,
        start: i * 60,
        size: 60,
        key: `item-${i}`,
      })),
    measureElement: () => {},
  }),
}));

import TeamDetail, { meta } from "./team.$teamId";

const mockTeam = {
  id: "team-1",
  name: "Frontend Team",
  description: "Manages frontend repositories",
  repositories: [
    {
      id: "tr-1",
      repository: {
        id: "repo-1",
        name: "web-app",
        fullName: "org/web-app",
        description: "Main web application",
      },
    },
  ],
  projects: [
    {
      id: "tp-1",
      project: {
        id: "proj-1",
        name: "Web Platform",
        key: "WEB",
        description: "Web platform project",
      },
    },
  ],
};

const mockAllRepositories = [
  {
    id: "repo-1",
    name: "web-app",
    fullName: "org/web-app",
    description: "Main web application",
  },
  {
    id: "repo-2",
    name: "api",
    fullName: "org/api",
    description: "Backend API",
  },
];

const mockAllProjects = [
  {
    id: "proj-1",
    name: "Web Platform",
    key: "WEB",
    description: "Web platform project",
  },
  {
    id: "proj-2",
    name: "Mobile App",
    key: "MOB",
    description: "Mobile application",
  },
];

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useActionData: () => undefined,
    useLoaderData: () => ({
      team: mockTeam,
      allRepositories: mockAllRepositories,
      allProjects: mockAllProjects,
      user: { name: "Test User", email: "test@example.com" },
    }),
    useFetcher: () => ({
      submit: vi.fn(),
    }),
    Form: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => <form {...props}>{children}</form>,
  };
});

describe("TeamDetail meta", () => {
  it("exports correct title and description meta tags", () => {
    const metaTags = meta({ data: { team: mockTeam } } as never);

    expect(metaTags).toEqual([
      { title: "Frontend Team - Teams - Settings - Momentum" },
      {
        name: "description",
        content: "Manage Frontend Team team assignments",
      },
    ]);
  });
});

describe("TeamDetail", () => {
  it("renders back link to teams list", () => {
    render(
      <MemoryRouter>
        <TeamDetail />
      </MemoryRouter>
    );

    const backLink = screen.getByRole("link", { name: /back to teams/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/settings/teams");
  });

  it("renders team name and description", () => {
    render(
      <MemoryRouter>
        <TeamDetail />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { level: 2, name: "Frontend Team" })).toBeInTheDocument();
    expect(screen.getByText("Manages frontend repositories")).toBeInTheDocument();
  });

  it("renders edit team button", () => {
    render(
      <MemoryRouter>
        <TeamDetail />
      </MemoryRouter>
    );

    expect(screen.getByRole("button", { name: "Edit Team" })).toBeInTheDocument();
  });

  it("displays repository count", () => {
    render(
      <MemoryRouter>
        <TeamDetail />
      </MemoryRouter>
    );

    expect(screen.getByText("Repositories (1)")).toBeInTheDocument();
  });

  it("displays project count", () => {
    render(
      <MemoryRouter>
        <TeamDetail />
      </MemoryRouter>
    );

    expect(screen.getByText("Projects (1)")).toBeInTheDocument();
  });

  it("renders repository assignment list", () => {
    render(
      <MemoryRouter>
        <TeamDetail />
      </MemoryRouter>
    );

    expect(screen.getByText("web-app")).toBeInTheDocument();
    expect(screen.getByText("api")).toBeInTheDocument();
  });

  it("renders project assignment list", () => {
    render(
      <MemoryRouter>
        <TeamDetail />
      </MemoryRouter>
    );

    expect(screen.getByText("Web Platform")).toBeInTheDocument();
    expect(screen.getByText("(WEB)")).toBeInTheDocument();
    expect(screen.getByText("Mobile App")).toBeInTheDocument();
    expect(screen.getByText("(MOB)")).toBeInTheDocument();
  });
});

describe("TeamDetail edit mode", () => {
  it("shows edit form when Edit Team button is clicked", async () => {
    const user = (await import("@testing-library/user-event")).default;
    const userEvent = user.setup();

    render(
      <MemoryRouter>
        <TeamDetail />
      </MemoryRouter>
    );

    const editButton = screen.getByRole("button", { name: "Edit Team" });
    await userEvent.click(editButton);

    expect(screen.getByRole("heading", { level: 2, name: "Edit Team" })).toBeInTheDocument();
    expect(screen.getByLabelText("Team Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toBeInTheDocument();
  });

  it("hides edit form when close button is clicked", async () => {
    const user = (await import("@testing-library/user-event")).default;
    const userEvent = user.setup();

    render(
      <MemoryRouter>
        <TeamDetail />
      </MemoryRouter>
    );

    const editButton = screen.getByRole("button", { name: "Edit Team" });
    await userEvent.click(editButton);

    expect(screen.getByRole("heading", { level: 2, name: "Edit Team" })).toBeInTheDocument();

    const closeButton = screen.getByRole("button", { name: "✕" });
    await userEvent.click(closeButton);

    expect(screen.queryByRole("heading", { level: 2, name: "Edit Team" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Frontend Team" })).toBeInTheDocument();
  });

  it("hides edit form when Cancel button is clicked", async () => {
    const user = (await import("@testing-library/user-event")).default;
    const userEvent = user.setup();

    render(
      <MemoryRouter>
        <TeamDetail />
      </MemoryRouter>
    );

    const editButton = screen.getByRole("button", { name: "Edit Team" });
    await userEvent.click(editButton);

    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    await userEvent.click(cancelButton);

    expect(screen.queryByRole("heading", { level: 2, name: "Edit Team" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Frontend Team" })).toBeInTheDocument();
  });

  it("pre-populates form with existing team data", async () => {
    const user = (await import("@testing-library/user-event")).default;
    const userEvent = user.setup();

    render(
      <MemoryRouter>
        <TeamDetail />
      </MemoryRouter>
    );

    const editButton = screen.getByRole("button", { name: "Edit Team" });
    await userEvent.click(editButton);

    const nameInput = screen.getByLabelText("Team Name") as HTMLInputElement;
    const descriptionInput = screen.getByLabelText("Description") as HTMLTextAreaElement;

    expect(nameInput.value).toBe("Frontend Team");
    expect(descriptionInput.value).toBe("Manages frontend repositories");
  });

  it("includes hidden intent field in edit form", async () => {
    const user = (await import("@testing-library/user-event")).default;
    const userEvent = user.setup();

    const { container } = render(
      <MemoryRouter>
        <TeamDetail />
      </MemoryRouter>
    );

    const editButton = screen.getByRole("button", { name: "Edit Team" });
    await userEvent.click(editButton);

    const intentInput = container.querySelector('input[name="intent"]') as HTMLInputElement;
    expect(intentInput).toBeInTheDocument();
    expect(intentInput.value).toBe("update-team");
    expect(intentInput.type).toBe("hidden");
  });

  it("renders Save Changes button in edit form", async () => {
    const user = (await import("@testing-library/user-event")).default;
    const userEvent = user.setup();

    render(
      <MemoryRouter>
        <TeamDetail />
      </MemoryRouter>
    );

    const editButton = screen.getByRole("button", { name: "Edit Team" });
    await userEvent.click(editButton);

    expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument();
  });

  it("renders section subtitles for repositories and projects", () => {
    render(
      <MemoryRouter>
        <TeamDetail />
      </MemoryRouter>
    );

    expect(screen.getByText("Assign repositories to this team")).toBeInTheDocument();
    expect(screen.getByText("Assign projects to this team")).toBeInTheDocument();
  });
});
