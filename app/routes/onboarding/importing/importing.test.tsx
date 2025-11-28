import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import Importing from "./importing";

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useLoaderData: () => ({
      enabledRepos: 25,
      message: "Import has been initiated for enabled repositories. Data will be collected in the background.",
    }),
    Form: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => <form {...props}>{children}</form>,
  };
});

describe("Importing", () => {
  it("renders loading spinner icon", () => {
    render(
      <MemoryRouter>
        <Importing />
      </MemoryRouter>
    );

    expect(screen.getByRole("img", { name: "Loading spinner" })).toBeInTheDocument();
  });

  it("renders page title", () => {
    render(
      <MemoryRouter>
        <Importing />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { level: 1, name: "Import Started" })).toBeInTheDocument();
  });

  it("renders import message from loader data", () => {
    render(
      <MemoryRouter>
        <Importing />
      </MemoryRouter>
    );

    expect(screen.getByText(/Import has been initiated for enabled repositories/)).toBeInTheDocument();
  });

  it("renders repository count from loader data", () => {
    render(
      <MemoryRouter>
        <Importing />
      </MemoryRouter>
    );

    expect(screen.getByText("25")).toBeInTheDocument();
    expect(screen.getByText("Repositories Selected")).toBeInTheDocument();
  });

  it("renders what's happening now section", () => {
    render(
      <MemoryRouter>
        <Importing />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { level: 3, name: "What's happening now:" })).toBeInTheDocument();
    expect(screen.getByText("Repository metadata has been saved")).toBeInTheDocument();
    expect(screen.getByText(/Background jobs will collect commit history/)).toBeInTheDocument();
    expect(screen.getByText("Pull requests and contributors will be imported")).toBeInTheDocument();
    expect(screen.getByText(/CI\/CD pipeline data will be gathered/)).toBeInTheDocument();
  });

  it("renders info note about import duration", () => {
    render(
      <MemoryRouter>
        <Importing />
      </MemoryRouter>
    );

    expect(screen.getByText(/The import process may take several minutes to hours/)).toBeInTheDocument();
  });

  it("renders Back to Repository Selection link", () => {
    render(
      <MemoryRouter>
        <Importing />
      </MemoryRouter>
    );

    const backLink = screen.getByRole("link", { name: "Back to Repository Selection" });
    expect(backLink).toHaveAttribute("href", "/onboarding/repositories");
  });

  it("renders Continue to Dashboard button with correct form intent", () => {
    render(
      <MemoryRouter>
        <Importing />
      </MemoryRouter>
    );

    expect(screen.getByRole("button", { name: "Continue to Dashboard" })).toBeInTheDocument();

    const hiddenInput = document.querySelector('input[name="intent"]');
    expect(hiddenInput).toHaveValue("continue");
  });

  it("renders within onboarding container", () => {
    const { container } = render(
      <MemoryRouter>
        <Importing />
      </MemoryRouter>
    );

    expect(container.querySelector(".onboarding-container")).toBeInTheDocument();
    expect(container.querySelector(".importing-content")).toBeInTheDocument();
  });
});
