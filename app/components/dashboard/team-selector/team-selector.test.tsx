import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TeamSelector } from "./team-selector";

const mockNavigate = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useSearchParams: () => [mockSearchParams, vi.fn()],
    useNavigate: () => mockNavigate,
  };
});

describe("TeamSelector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it("renders team selector trigger", () => {
    render(
      <MemoryRouter>
        <TeamSelector teams={[]} />
      </MemoryRouter>
    );

    expect(screen.getByText("Team:")).toBeInTheDocument();
    expect(screen.getByText("All")).toBeInTheDocument();
  });

  it("shows 'All' when no team is selected", () => {
    const teams = [{ id: "1", name: "Frontend" }];

    render(
      <MemoryRouter>
        <TeamSelector teams={teams} />
      </MemoryRouter>
    );

    expect(screen.getByRole("button")).toHaveTextContent("All");
  });

  it("shows selected team name when team is selected", () => {
    mockSearchParams = new URLSearchParams({ teamId: "1" });
    const teams = [
      { id: "1", name: "Frontend" },
      { id: "2", name: "Backend" },
    ];

    render(
      <MemoryRouter>
        <TeamSelector teams={teams} />
      </MemoryRouter>
    );

    expect(screen.getByRole("button")).toHaveTextContent("Frontend");
  });

  it("opens dropdown when clicked", () => {
    const teams = [{ id: "1", name: "Frontend" }];

    render(
      <MemoryRouter>
        <TeamSelector teams={teams} />
      </MemoryRouter>
    );

    const trigger = screen.getByRole("button", { expanded: false });
    fireEvent.click(trigger);

    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("shows all option in dropdown", () => {
    const teams = [{ id: "1", name: "Frontend" }];

    render(
      <MemoryRouter>
        <TeamSelector teams={teams} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { expanded: false }));

    const allOptions = screen.getAllByRole("option");
    expect(allOptions[0]).toHaveTextContent("All");
  });

  it("shows team options in dropdown", () => {
    const teams = [
      { id: "1", name: "Frontend" },
      { id: "2", name: "Backend" },
    ];

    render(
      <MemoryRouter>
        <TeamSelector teams={teams} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { expanded: false }));

    expect(screen.getByRole("option", { name: "Frontend" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Backend" })).toBeInTheDocument();
  });

  it("navigates with teamId when team is selected", () => {
    const teams = [{ id: "team-1", name: "Frontend" }];

    render(
      <MemoryRouter>
        <TeamSelector teams={teams} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { expanded: false }));
    fireEvent.click(screen.getByRole("option", { name: "Frontend" }));

    expect(mockNavigate).toHaveBeenCalledWith("?teamId=team-1");
  });

  it("navigates without teamId when All is selected", () => {
    mockSearchParams = new URLSearchParams({ teamId: "team-1" });
    const teams = [{ id: "team-1", name: "Frontend" }];

    render(
      <MemoryRouter>
        <TeamSelector teams={teams} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { expanded: false }));
    const allOptions = screen.getAllByRole("option");
    fireEvent.click(allOptions[0]);

    expect(mockNavigate).toHaveBeenCalledWith("?");
  });

  it("closes dropdown after selection", () => {
    const teams = [{ id: "1", name: "Frontend" }];

    render(
      <MemoryRouter>
        <TeamSelector teams={teams} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { expanded: false }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("option", { name: "Frontend" }));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("shows empty state when no teams configured", () => {
    render(
      <MemoryRouter>
        <TeamSelector teams={[]} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { expanded: false }));

    expect(screen.getByText("No teams configured")).toBeInTheDocument();
  });

  it("shows down arrow when closed", () => {
    render(
      <MemoryRouter>
        <TeamSelector teams={[]} />
      </MemoryRouter>
    );

    expect(screen.getByText("▼")).toBeInTheDocument();
  });

  it("shows up arrow when open", () => {
    render(
      <MemoryRouter>
        <TeamSelector teams={[]} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { expanded: false }));

    expect(screen.getByText("▲")).toBeInTheDocument();
  });

  it("marks selected team as active", () => {
    mockSearchParams = new URLSearchParams({ teamId: "1" });
    const teams = [
      { id: "1", name: "Frontend" },
      { id: "2", name: "Backend" },
    ];

    render(
      <MemoryRouter>
        <TeamSelector teams={teams} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { expanded: false }));

    const frontendOption = screen.getByRole("option", { name: "Frontend" });
    const backendOption = screen.getByRole("option", { name: "Backend" });

    expect(frontendOption).toHaveClass("active");
    expect(backendOption).not.toHaveClass("active");
  });

  it("closes dropdown when clicking outside", () => {
    const teams = [{ id: "1", name: "Frontend" }];

    render(
      <MemoryRouter>
        <div data-testid="outside">
          <TeamSelector teams={teams} />
        </div>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { expanded: false }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId("outside"));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
