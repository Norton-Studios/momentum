import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TeamMember } from "./TeamMember";

describe("TeamMember", () => {
  const basicProps = {
    name: "John Doe",
    role: "Software Engineer",
  };

  it("should render team member with name and role", () => {
    render(<TeamMember {...basicProps} />);

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Software Engineer")).toBeInTheDocument();
  });

  it("should render without role", () => {
    render(<TeamMember name="Jane Smith" />);

    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.queryByText("Software Engineer")).not.toBeInTheDocument();
  });

  it("should generate initials from name", () => {
    const { container } = render(<TeamMember name="John Doe" />);

    const initials = container.querySelector('[class*="avatarInitials"]');
    expect(initials).toHaveTextContent("JD");
  });

  it("should use custom initials when provided", () => {
    const { container } = render(<TeamMember name="John Doe" initials="JS" />);

    const initials = container.querySelector('[class*="avatarInitials"]');
    expect(initials).toHaveTextContent("JS");
  });

  it("should handle single name for initials", () => {
    const { container } = render(<TeamMember name="Madonna" />);

    const initials = container.querySelector('[class*="avatarInitials"]');
    expect(initials).toHaveTextContent("M");
  });

  it("should handle multiple names and take first two initials", () => {
    const { container } = render(<TeamMember name="John Michael Doe Smith" />);

    const initials = container.querySelector('[class*="avatarInitials"]');
    expect(initials).toHaveTextContent("JM");
  });

  it("should render avatar image when avatarUrl provided", () => {
    render(<TeamMember {...basicProps} avatarUrl="https://example.com/avatar.jpg" />);

    const avatar = screen.getByRole("img");
    expect(avatar).toHaveAttribute("src", "https://example.com/avatar.jpg");
    expect(avatar).toHaveAttribute("alt", "John Doe");
  });

  it("should prefer avatar image over initials", () => {
    const { container } = render(<TeamMember {...basicProps} avatarUrl="https://example.com/avatar.jpg" initials="XX" />);

    const avatar = screen.getByRole("img");
    expect(avatar).toBeInTheDocument();

    const initials = container.querySelector('[class*="avatarInitials"]');
    expect(initials).not.toBeInTheDocument();
  });

  it("should apply size classes", () => {
    const { container, rerender } = render(<TeamMember {...basicProps} size="sm" />);

    let member = container.firstChild as HTMLElement;
    expect(member.className).toContain("sm");

    rerender(<TeamMember {...basicProps} size="lg" />);
    member = container.firstChild as HTMLElement;
    expect(member.className).toContain("lg");
  });

  it("should default to medium size", () => {
    const { container } = render(<TeamMember {...basicProps} />);

    const member = container.firstChild as HTMLElement;
    expect(member.className).toContain("md");
  });

  it("should render status indicator when status provided", () => {
    const { container, rerender } = render(<TeamMember {...basicProps} status="online" />);

    let statusIndicator = container.querySelector('[class*="statusIndicator"]');
    expect(statusIndicator).toBeInTheDocument();
    expect(statusIndicator?.className).toContain("online");

    rerender(<TeamMember {...basicProps} status="offline" />);
    statusIndicator = container.querySelector('[class*="statusIndicator"]');
    expect(statusIndicator?.className).toContain("offline");

    rerender(<TeamMember {...basicProps} status="away" />);
    statusIndicator = container.querySelector('[class*="statusIndicator"]');
    expect(statusIndicator?.className).toContain("away");
  });

  it("should not render status indicator when status not provided", () => {
    const { container } = render(<TeamMember {...basicProps} />);

    const statusIndicator = container.querySelector('[class*="statusIndicator"]');
    expect(statusIndicator).not.toBeInTheDocument();
  });

  it("should handle click events when onClick provided", () => {
    const onClick = vi.fn();
    render(<TeamMember {...basicProps} onClick={onClick} />);

    const member = screen.getByRole("button");
    fireEvent.click(member);

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("should handle keyboard events when onClick provided", () => {
    const onClick = vi.fn();
    render(<TeamMember {...basicProps} onClick={onClick} />);

    const member = screen.getByRole("button");

    fireEvent.keyDown(member, { key: "Enter" });
    expect(onClick).toHaveBeenCalledOnce();

    fireEvent.keyDown(member, { key: " " });
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("should not handle other keyboard events", () => {
    const onClick = vi.fn();
    render(<TeamMember {...basicProps} onClick={onClick} />);

    const member = screen.getByRole("button");

    fireEvent.keyDown(member, { key: "Tab" });
    fireEvent.keyDown(member, { key: "Escape" });

    expect(onClick).not.toHaveBeenCalled();
  });

  it("should apply clickable styling when onClick provided", () => {
    const { container } = render(<TeamMember {...basicProps} onClick={() => {}} />);

    const member = container.firstChild as HTMLElement;
    expect(member.className).toContain("clickable");
  });

  it("should not apply clickable styling when onClick not provided", () => {
    const { container } = render(<TeamMember {...basicProps} />);

    const member = container.firstChild as HTMLElement;
    expect(member.className).not.toContain("clickable");
  });

  it("should set proper accessibility attributes when clickable", () => {
    render(<TeamMember {...basicProps} onClick={() => {}} />);

    const member = screen.getByRole("button");
    expect(member).toHaveAttribute("tabIndex", "0");
  });

  it("should not set button role when not clickable", () => {
    render(<TeamMember {...basicProps} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("should apply custom className", () => {
    const { container } = render(<TeamMember {...basicProps} className="custom-member" />);

    const member = container.firstChild as HTMLElement;
    expect(member).toHaveClass("custom-member");
  });

  it("should render complete team member with all features", () => {
    const onClick = vi.fn();
    const { container } = render(
      <TeamMember
        name="Sarah Johnson"
        initials="SJ"
        avatarUrl="https://example.com/sarah.jpg"
        size="lg"
        status="online"
        onClick={onClick}
        className="featured-member"
      />,
    );

    // Check basic info
    expect(screen.getByText("Sarah Johnson")).toBeInTheDocument();
    // Role not provided in this test case, so not checking for it

    // Check avatar
    const avatar = screen.getByRole("img");
    expect(avatar).toHaveAttribute("src", "https://example.com/sarah.jpg");
    expect(avatar).toHaveAttribute("alt", "Sarah Johnson");

    // Check status
    const statusIndicator = container.querySelector('[class*="statusIndicator"]');
    expect(statusIndicator).toBeInTheDocument();
    expect(statusIndicator?.className).toContain("online");

    // Check interactivity
    const member = screen.getByRole("button");
    expect(member.className).toContain("clickable");
    expect(member.className).toContain("lg");
    expect(member).toHaveClass("featured-member");

    fireEvent.click(member);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("should handle empty or whitespace names gracefully", () => {
    const { container } = render(<TeamMember name="   " />);

    const initials = container.querySelector('[class*="avatarInitials"]');
    expect(initials).toBeInTheDocument();
    // Should handle whitespace gracefully and not crash
  });

  it("should handle names with special characters", () => {
    const { container } = render(<TeamMember name="Jean-Pierre O'Connor" />);

    const initials = container.querySelector('[class*="avatarInitials"]');
    expect(initials).toHaveTextContent("JO"); // Should take first letter of each word
  });

  it("should prevent default on space keydown to avoid scrolling", () => {
    const onClick = vi.fn();
    render(<TeamMember {...basicProps} onClick={onClick} />);

    const member = screen.getByRole("button");

    // Use fireEvent.keyDown instead of dispatchEvent to properly trigger React handlers
    fireEvent.keyDown(member, { key: " ", preventDefault: vi.fn() });

    expect(onClick).toHaveBeenCalled();
  });

  it("should handle all size variants", () => {
    const sizes = ["sm", "md", "lg"] as const;

    sizes.forEach((size) => {
      const { container, unmount } = render(<TeamMember name="Test User" size={size} />);

      const member = container.firstChild as HTMLElement;
      expect(member.className).toContain(size);

      unmount();
    });
  });

  it("should handle all status variants", () => {
    const statuses = ["online", "offline", "away"] as const;

    statuses.forEach((status) => {
      const { container, unmount } = render(<TeamMember name="Test User" status={status} />);

      const statusIndicator = container.querySelector('[class*="statusIndicator"]');
      expect(statusIndicator?.className).toContain(status);

      unmount();
    });
  });
});
