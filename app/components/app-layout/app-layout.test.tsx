import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { AppLayout } from "./app-layout";

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    Form: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => <form {...props}>{children}</form>,
  };
});

describe("AppLayout", () => {
  const defaultProps = {
    activeNav: "organization" as const,
    user: { name: "Test User", email: "test@example.com" },
  };

  it("renders header with logo", () => {
    render(
      <MemoryRouter>
        <AppLayout {...defaultProps}>
          <div>Content</div>
        </AppLayout>
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: /momentum/i })).toBeInTheDocument();
  });

  it("renders main navigation with all items", () => {
    render(
      <MemoryRouter>
        <AppLayout {...defaultProps}>
          <div>Content</div>
        </AppLayout>
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: "Organization" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Team" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Individual" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Settings" })).toBeInTheDocument();
  });

  it("highlights active navigation item", () => {
    render(
      <MemoryRouter>
        <AppLayout activeNav="settings" user={defaultProps.user}>
          <div>Content</div>
        </AppLayout>
      </MemoryRouter>
    );

    const settingsLink = screen.getByRole("link", { name: "Settings" });
    expect(settingsLink).toHaveClass("active");
  });

  it("renders user name in profile button", () => {
    render(
      <MemoryRouter>
        <AppLayout {...defaultProps}>
          <div>Content</div>
        </AppLayout>
      </MemoryRouter>
    );

    expect(screen.getByText("Test User")).toBeInTheDocument();
  });

  it("renders user email when name is null", () => {
    render(
      <MemoryRouter>
        <AppLayout activeNav="organization" user={{ name: null, email: "test@example.com" }}>
          <div>Content</div>
        </AppLayout>
      </MemoryRouter>
    );

    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  it("displays user initials from name", () => {
    render(
      <MemoryRouter>
        <AppLayout {...defaultProps}>
          <div>Content</div>
        </AppLayout>
      </MemoryRouter>
    );

    expect(screen.getByText("TU")).toBeInTheDocument();
  });

  it("displays email initial when name is null", () => {
    render(
      <MemoryRouter>
        <AppLayout activeNav="organization" user={{ name: null, email: "test@example.com" }}>
          <div>Content</div>
        </AppLayout>
      </MemoryRouter>
    );

    expect(screen.getByText("T")).toBeInTheDocument();
  });

  it("opens dropdown when profile button is clicked", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <AppLayout {...defaultProps}>
          <div>Content</div>
        </AppLayout>
      </MemoryRouter>
    );

    const profileButton = screen.getByRole("button", { name: /test user/i });
    await user.click(profileButton);

    expect(screen.getByRole("link", { name: "Profile" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log Out" })).toBeInTheDocument();
  });

  it("closes dropdown when profile button is clicked again", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <AppLayout {...defaultProps}>
          <div>Content</div>
        </AppLayout>
      </MemoryRouter>
    );

    const profileButton = screen.getByRole("button", { name: /test user/i });
    await user.click(profileButton);

    expect(screen.getByRole("link", { name: "Profile" })).toBeInTheDocument();

    await user.click(profileButton);

    expect(screen.queryByRole("link", { name: "Profile" })).not.toBeInTheDocument();
  });

  it("closes dropdown when clicking outside", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <AppLayout {...defaultProps}>
          <div data-testid="content">Content</div>
        </AppLayout>
      </MemoryRouter>
    );

    const profileButton = screen.getByRole("button", { name: /test user/i });
    await user.click(profileButton);

    expect(screen.getByRole("link", { name: "Profile" })).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId("content"));

    expect(screen.queryByRole("link", { name: "Profile" })).not.toBeInTheDocument();
  });

  it("closes dropdown when Profile link is clicked", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <AppLayout {...defaultProps}>
          <div>Content</div>
        </AppLayout>
      </MemoryRouter>
    );

    const profileButton = screen.getByRole("button", { name: /test user/i });
    await user.click(profileButton);

    const profileLink = screen.getByRole("link", { name: "Profile" });
    await user.click(profileLink);

    expect(screen.queryByRole("link", { name: "Profile" })).not.toBeInTheDocument();
  });

  it("renders children content", () => {
    render(
      <MemoryRouter>
        <AppLayout {...defaultProps}>
          <div data-testid="child-content">Child Content</div>
        </AppLayout>
      </MemoryRouter>
    );

    expect(screen.getByTestId("child-content")).toBeInTheDocument();
    expect(screen.getByText("Child Content")).toBeInTheDocument();
  });

  it("has correct navigation links", () => {
    render(
      <MemoryRouter>
        <AppLayout {...defaultProps}>
          <div>Content</div>
        </AppLayout>
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: "Organization" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/settings");
  });
});
