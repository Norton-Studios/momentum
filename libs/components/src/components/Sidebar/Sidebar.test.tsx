import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Sidebar } from "./Sidebar";

describe("Sidebar", () => {
  const mockItems = [
    { id: "dashboard", label: "Dashboard", href: "/dashboard" },
    { id: "projects", label: "Projects", href: "/projects" },
    {
      id: "settings",
      label: "Settings",
      children: [
        { id: "profile", label: "Profile", href: "/settings/profile" },
        { id: "account", label: "Account", href: "/settings/account" },
      ],
    },
  ];

  it("should render sidebar with items", () => {
    render(<Sidebar items={mockItems} />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Projects")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("should render as aside element", () => {
    const { container } = render(<Sidebar items={mockItems} />);

    const sidebar = container.querySelector("aside");
    expect(sidebar).toBeInTheDocument();
  });

  it("should handle item click", () => {
    const onItemClick = vi.fn();
    render(<Sidebar items={mockItems} onItemClick={onItemClick} />);

    const dashboardButton = screen.getByText("Dashboard");
    fireEvent.click(dashboardButton);

    expect(onItemClick).toHaveBeenCalledWith({
      id: "dashboard",
      label: "Dashboard",
      href: "/dashboard",
    });
  });

  it("should indicate active item", () => {
    render(<Sidebar items={mockItems} activeItem="dashboard" />);

    const dashboardButton = screen.getByText("Dashboard");
    expect(dashboardButton.className).toContain("active");
  });

  it("should expand parent items with children", () => {
    render(<Sidebar items={mockItems} />);

    const settingsButton = screen.getByText("Settings");

    // Children should not be visible initially
    expect(screen.queryByText("Profile")).not.toBeInTheDocument();
    expect(screen.queryByText("Account")).not.toBeInTheDocument();

    fireEvent.click(settingsButton);

    // Children should be visible after clicking
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("Account")).toBeInTheDocument();
  });

  it("should toggle expanded state on repeated clicks", () => {
    render(<Sidebar items={mockItems} />);

    const settingsButton = screen.getByText("Settings");

    // Expand
    fireEvent.click(settingsButton);
    expect(screen.getByText("Profile")).toBeInTheDocument();

    // Collapse
    fireEvent.click(settingsButton);
    expect(screen.queryByText("Profile")).not.toBeInTheDocument();
  });

  it("should render icons when provided", () => {
    const itemsWithIcons = [
      {
        id: "home",
        label: "Home",
        icon: <span data-testid="home-icon">🏠</span>,
      },
    ];

    render(<Sidebar items={itemsWithIcons} />);

    expect(screen.getByTestId("home-icon")).toBeInTheDocument();
  });

  it("should render chevron for items with children", () => {
    const { container } = render(<Sidebar items={mockItems} />);

    const settingsButton = screen.getByText("Settings");
    const chevron = settingsButton.querySelector("svg");
    expect(chevron).toBeInTheDocument();
  });

  it("should not render chevron for items without children", () => {
    const { container } = render(<Sidebar items={mockItems} />);

    const dashboardButton = screen.getByText("Dashboard");
    const chevron = dashboardButton.querySelector("svg");
    expect(chevron).not.toBeInTheDocument();
  });

  it("should apply proper nesting levels for children", () => {
    render(<Sidebar items={mockItems} />);

    const settingsButton = screen.getByText("Settings");
    fireEvent.click(settingsButton);

    const profileButton = screen.getByText("Profile");
    // Child items should have increased padding for nesting
    expect(profileButton).toHaveStyle("padding-left: 32px"); // 16 + 16 for level 1
  });

  it("should render logo when provided", () => {
    const logo = <div data-testid="custom-logo">My App</div>;
    render(<Sidebar items={mockItems} logo={logo} />);

    expect(screen.getByTestId("custom-logo")).toBeInTheDocument();
  });

  it("should render footer when provided", () => {
    const footer = <div data-testid="custom-footer">© 2024</div>;
    render(<Sidebar items={mockItems} footer={footer} />);

    expect(screen.getByTestId("custom-footer")).toBeInTheDocument();
  });

  it("should apply custom className", () => {
    const { container } = render(<Sidebar items={mockItems} className="custom-sidebar" />);

    const sidebar = container.querySelector("aside");
    expect(sidebar).toHaveClass("custom-sidebar");
  });

  it("should handle nested children clicks", () => {
    const onItemClick = vi.fn();
    render(<Sidebar items={mockItems} onItemClick={onItemClick} />);

    const settingsButton = screen.getByText("Settings");
    fireEvent.click(settingsButton);

    const profileButton = screen.getByText("Profile");
    fireEvent.click(profileButton);

    expect(onItemClick).toHaveBeenCalledWith({
      id: "profile",
      label: "Profile",
      href: "/settings/profile",
    });
  });

  it("should maintain expanded state independently for multiple parent items", () => {
    const complexItems = [
      {
        id: "group1",
        label: "Group 1",
        children: [{ id: "item1", label: "Item 1" }],
      },
      {
        id: "group2",
        label: "Group 2",
        children: [{ id: "item2", label: "Item 2" }],
      },
    ];

    render(<Sidebar items={complexItems} />);

    // Expand first group
    fireEvent.click(screen.getByText("Group 1"));
    expect(screen.getByText("Item 1")).toBeInTheDocument();
    expect(screen.queryByText("Item 2")).not.toBeInTheDocument();

    // Expand second group
    fireEvent.click(screen.getByText("Group 2"));
    expect(screen.getByText("Item 1")).toBeInTheDocument();
    expect(screen.getByText("Item 2")).toBeInTheDocument();

    // Collapse first group
    fireEvent.click(screen.getByText("Group 1"));
    expect(screen.queryByText("Item 1")).not.toBeInTheDocument();
    expect(screen.getByText("Item 2")).toBeInTheDocument();
  });

  it("should render complete sidebar with all features", () => {
    const completeItems = [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: <span data-testid="dashboard-icon">📊</span>,
      },
      {
        id: "admin",
        label: "Admin",
        icon: <span data-testid="admin-icon">⚙️</span>,
        children: [
          { id: "users", label: "Users", icon: <span data-testid="users-icon">👥</span> },
          { id: "roles", label: "Roles" },
        ],
      },
    ];

    const logo = <div data-testid="app-logo">Logo</div>;
    const footer = <div data-testid="app-footer">Footer</div>;
    const onItemClick = vi.fn();

    const { container } = render(
      <Sidebar items={completeItems} activeItem="dashboard" onItemClick={onItemClick} logo={logo} footer={footer} className="complete-sidebar" />,
    );

    // Check structure
    const sidebar = container.querySelector("aside");
    expect(sidebar).toHaveClass("complete-sidebar");

    // Check logo and footer
    expect(screen.getByTestId("app-logo")).toBeInTheDocument();
    expect(screen.getByTestId("app-footer")).toBeInTheDocument();

    // Check active state
    const dashboardButton = screen.getByText("Dashboard");
    expect(dashboardButton.className).toContain("active");

    // Check icons
    expect(screen.getByTestId("dashboard-icon")).toBeInTheDocument();
    expect(screen.getByTestId("admin-icon")).toBeInTheDocument();

    // Test expansion and nested icons
    const adminButton = screen.getByText("Admin");
    fireEvent.click(adminButton);
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByTestId("users-icon")).toBeInTheDocument();

    // Test interaction
    fireEvent.click(dashboardButton);
    expect(onItemClick).toHaveBeenCalledWith({
      id: "dashboard",
      label: "Dashboard",
      icon: expect.anything(),
    });
  });

  it("should handle empty items array", () => {
    render(<Sidebar items={[]} />);

    const nav = screen.getByRole("navigation");
    expect(nav).toBeInTheDocument();

    const list = nav.querySelector("ul");
    expect(list?.children).toHaveLength(0);
  });
});
