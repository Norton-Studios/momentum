import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ContributorSelector } from "./contributor-selector";

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

const mockContributors = [
  { id: "1", name: "Jane Smith", username: "janesmith", avatarUrl: "https://example.com/jane.jpg" },
  { id: "2", name: "John Doe", username: "johndoe", avatarUrl: null },
  { id: "3", name: "Alice Johnson", username: null, avatarUrl: null },
];

describe("ContributorSelector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it("renders select contributor when no contributor selected", () => {
    render(
      <MemoryRouter>
        <ContributorSelector contributors={mockContributors} />
      </MemoryRouter>
    );

    expect(screen.getByText("Select contributor")).toBeInTheDocument();
  });

  it("renders selected contributor name", () => {
    render(
      <MemoryRouter>
        <ContributorSelector contributors={mockContributors} defaultContributorId="1" />
      </MemoryRouter>
    );

    expect(screen.getByRole("button")).toHaveTextContent("Jane Smith");
  });

  it("opens dropdown when clicked", () => {
    render(
      <MemoryRouter>
        <ContributorSelector contributors={mockContributors} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { expanded: false }));

    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("shows all contributors in dropdown", () => {
    render(
      <MemoryRouter>
        <ContributorSelector contributors={mockContributors} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { expanded: false }));

    expect(screen.getByRole("option", { name: /Jane Smith/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /John Doe/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Alice Johnson/ })).toBeInTheDocument();
  });

  it("shows username with @ prefix when available", () => {
    render(
      <MemoryRouter>
        <ContributorSelector contributors={mockContributors} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { expanded: false }));

    expect(screen.getByText("@janesmith")).toBeInTheDocument();
    expect(screen.getByText("@johndoe")).toBeInTheDocument();
  });

  it("navigates with contributorId when contributor selected", () => {
    render(
      <MemoryRouter>
        <ContributorSelector contributors={mockContributors} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { expanded: false }));
    fireEvent.click(screen.getByRole("option", { name: /Jane Smith/ }));

    expect(mockNavigate).toHaveBeenCalledWith("?contributorId=1");
  });

  it("closes dropdown after selection", () => {
    render(
      <MemoryRouter>
        <ContributorSelector contributors={mockContributors} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { expanded: false }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("option", { name: /Jane Smith/ }));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("shows empty state when no contributors", () => {
    render(
      <MemoryRouter>
        <ContributorSelector contributors={[]} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { expanded: false }));

    expect(screen.getByText("No contributors found")).toBeInTheDocument();
  });

  it("shows down arrow when closed", () => {
    render(
      <MemoryRouter>
        <ContributorSelector contributors={mockContributors} />
      </MemoryRouter>
    );

    expect(screen.getByText("▼")).toBeInTheDocument();
  });

  it("shows up arrow when open", () => {
    render(
      <MemoryRouter>
        <ContributorSelector contributors={mockContributors} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { expanded: false }));

    expect(screen.getByText("▲")).toBeInTheDocument();
  });

  it("marks selected contributor as active", () => {
    mockSearchParams = new URLSearchParams({ contributorId: "1" });

    render(
      <MemoryRouter>
        <ContributorSelector contributors={mockContributors} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { expanded: false }));

    const janeOption = screen.getByRole("option", { name: /Jane Smith/ });
    const johnOption = screen.getByRole("option", { name: /John Doe/ });

    expect(janeOption).toHaveClass("active");
    expect(johnOption).not.toHaveClass("active");
  });

  it("closes dropdown when clicking outside", () => {
    render(
      <MemoryRouter>
        <div data-testid="outside">
          <ContributorSelector contributors={mockContributors} />
        </div>
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { expanded: false }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId("outside"));
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("shows avatar image when avatarUrl is provided", () => {
    const { container } = render(
      <MemoryRouter>
        <ContributorSelector contributors={mockContributors} defaultContributorId="1" />
      </MemoryRouter>
    );

    const avatar = container.querySelector(".contributor-avatar-img");
    expect(avatar).toHaveAttribute("src", "https://example.com/jane.jpg");
  });

  it("shows initials when no avatarUrl", () => {
    render(
      <MemoryRouter>
        <ContributorSelector contributors={mockContributors} defaultContributorId="2" />
      </MemoryRouter>
    );

    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("shows search input when more than 5 contributors", () => {
    const manyContributors = Array.from({ length: 6 }, (_, i) => ({
      id: `${i}`,
      name: `Contributor ${i}`,
      username: `user${i}`,
      avatarUrl: null,
    }));

    render(
      <MemoryRouter>
        <ContributorSelector contributors={manyContributors} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { expanded: false }));

    expect(screen.getByPlaceholderText("Search contributors...")).toBeInTheDocument();
  });

  it("does not show search input when 5 or fewer contributors", () => {
    render(
      <MemoryRouter>
        <ContributorSelector contributors={mockContributors} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { expanded: false }));

    expect(screen.queryByPlaceholderText("Search contributors...")).not.toBeInTheDocument();
  });

  it("filters contributors by name", () => {
    const manyContributors = Array.from({ length: 6 }, (_, i) => ({
      id: `${i}`,
      name: `Contributor ${i}`,
      username: `user${i}`,
      avatarUrl: null,
    }));

    render(
      <MemoryRouter>
        <ContributorSelector contributors={manyContributors} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { expanded: false }));
    fireEvent.change(screen.getByPlaceholderText("Search contributors..."), { target: { value: "Contributor 1" } });

    expect(screen.getByRole("option", { name: /Contributor 1/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Contributor 2/ })).not.toBeInTheDocument();
  });

  it("filters contributors by username", () => {
    const manyContributors = Array.from({ length: 6 }, (_, i) => ({
      id: `${i}`,
      name: `Contributor ${i}`,
      username: `user${i}`,
      avatarUrl: null,
    }));

    render(
      <MemoryRouter>
        <ContributorSelector contributors={manyContributors} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { expanded: false }));
    fireEvent.change(screen.getByPlaceholderText("Search contributors..."), { target: { value: "user3" } });

    expect(screen.getByRole("option", { name: /Contributor 3/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Contributor 1/ })).not.toBeInTheDocument();
  });

  it("shows no match message when search has no results", () => {
    const manyContributors = Array.from({ length: 6 }, (_, i) => ({
      id: `${i}`,
      name: `Contributor ${i}`,
      username: `user${i}`,
      avatarUrl: null,
    }));

    render(
      <MemoryRouter>
        <ContributorSelector contributors={manyContributors} />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { expanded: false }));
    fireEvent.change(screen.getByPlaceholderText("Search contributors..."), { target: { value: "xyz" } });

    expect(screen.getByText(/No contributors match "xyz"/)).toBeInTheDocument();
  });
});
