import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DataSourceCard } from "./DataSourceCard";

describe("DataSourceCard", () => {
  const basicProps = {
    provider: "github" as const,
    title: "GitHub",
    description: "Connect to GitHub repositories",
  };

  it("should render basic card", () => {
    render(<DataSourceCard {...basicProps} />);

    expect(screen.getByText("GitHub")).toBeInTheDocument();
    expect(screen.getByText("Connect to GitHub repositories")).toBeInTheDocument();
  });

  it("should render with custom provider", () => {
    render(<DataSourceCard provider="custom" title="Custom Provider" description="Custom integration" />);

    expect(screen.getByText("Custom Provider")).toBeInTheDocument();
    expect(screen.getByText("Custom integration")).toBeInTheDocument();
  });

  it("should render default icons for known providers", () => {
    const { container, rerender } = render(<DataSourceCard {...basicProps} provider="github" />);
    expect(container.querySelector("svg")).toBeInTheDocument();

    rerender(<DataSourceCard {...basicProps} provider="gitlab" />);
    expect(container.querySelector("svg")).toBeInTheDocument();

    rerender(<DataSourceCard {...basicProps} provider="bitbucket" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("should render custom icon when provided", () => {
    const CustomIcon = <span data-testid="custom-icon">🔧</span>;
    render(<DataSourceCard {...basicProps} icon={CustomIcon} />);

    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
  });

  it("should render features list", () => {
    const features = ["Pull requests", "Issues", "Actions"];
    const { container } = render(<DataSourceCard {...basicProps} features={features} />);

    features.forEach((feature) => {
      expect(screen.getByText(feature)).toBeInTheDocument();
    });

    const list = container.querySelector("ul");
    expect(list?.children).toHaveLength(3);
  });

  it("should not render features when empty", () => {
    const { container } = render(<DataSourceCard {...basicProps} features={[]} />);
    expect(container.querySelector("ul")).not.toBeInTheDocument();
  });

  it("should handle click events", () => {
    const onClick = vi.fn();
    const { container } = render(<DataSourceCard {...basicProps} onClick={onClick} />);

    const card = container.firstChild as HTMLElement;
    fireEvent.click(card);

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("should handle keyboard events", () => {
    const onClick = vi.fn();
    const { container } = render(<DataSourceCard {...basicProps} onClick={onClick} />);

    const card = container.firstChild as HTMLElement;

    fireEvent.keyDown(card, { key: "Enter" });
    expect(onClick).toHaveBeenCalledOnce();

    fireEvent.keyDown(card, { key: " " });
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("should not handle clicks when disabled", () => {
    const onClick = vi.fn();
    const { container } = render(<DataSourceCard {...basicProps} onClick={onClick} disabled />);

    const card = container.firstChild as HTMLElement;
    fireEvent.click(card);

    expect(onClick).not.toHaveBeenCalled();
  });

  it("should apply selected state", () => {
    const { container } = render(<DataSourceCard {...basicProps} selected />);

    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("selected");

    const checkmark = container.querySelector("svg");
    expect(checkmark).toBeInTheDocument();
  });

  it("should apply disabled state", () => {
    const { container } = render(<DataSourceCard {...basicProps} disabled />);

    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("disabled");
  });

  it("should apply clickable class when onClick provided", () => {
    const { container } = render(<DataSourceCard {...basicProps} onClick={() => {}} />);

    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("clickable");
  });

  it("should not apply clickable class when disabled", () => {
    const { container } = render(<DataSourceCard {...basicProps} onClick={() => {}} disabled />);

    const card = container.firstChild as HTMLElement;
    expect(card.className).not.toContain("clickable");
  });

  it("should apply custom className", () => {
    const { container } = render(<DataSourceCard {...basicProps} className="custom-card" />);

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass("custom-card");
  });

  it("should set proper accessibility attributes", () => {
    const { container } = render(<DataSourceCard {...basicProps} onClick={() => {}} />);

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveAttribute("role", "button");
    expect(card).toHaveAttribute("tabIndex", "0");
  });

  it("should not set accessibility attributes when not clickable", () => {
    const { container } = render(<DataSourceCard {...basicProps} />);

    const card = container.firstChild as HTMLElement;
    expect(card).not.toHaveAttribute("role");
    expect(card).not.toHaveAttribute("tabIndex");
  });

  it("should render complete card with all features", () => {
    const features = ["Feature 1", "Feature 2"];
    const onClick = vi.fn();
    const CustomIcon = <span data-testid="complete-icon">⚙️</span>;

    const { container } = render(
      <DataSourceCard
        provider="github"
        title="Complete Provider"
        description="Full featured provider"
        features={features}
        selected
        icon={CustomIcon}
        onClick={onClick}
        className="complete-card"
      />,
    );

    expect(screen.getByText("Complete Provider")).toBeInTheDocument();
    expect(screen.getByText("Full featured provider")).toBeInTheDocument();
    expect(screen.getByTestId("complete-icon")).toBeInTheDocument();
    expect(screen.getByText("Feature 1")).toBeInTheDocument();
    expect(screen.getByText("Feature 2")).toBeInTheDocument();

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass("complete-card");
    expect(card.className).toContain("selected");
    expect(card.className).toContain("clickable");

    // Should have checkmark (custom icon is a span, not SVG in this test)
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
