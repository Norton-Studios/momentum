import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Card } from "./Card";

describe("Card", () => {
  it("should render basic card", () => {
    const { container } = render(<Card />);
    const card = container.firstChild;
    expect(card).toBeInTheDocument();
  });

  it("should render with title and description", () => {
    render(<Card title="Test Title" description="Test Description" />);

    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("Test Description")).toBeInTheDocument();
  });

  it("should render with icon", () => {
    const TestIcon = <div data-testid="test-icon">Icon</div>;
    render(<Card icon={TestIcon} />);

    expect(screen.getByTestId("test-icon")).toBeInTheDocument();
  });

  it("should render children", () => {
    render(
      <Card>
        <div data-testid="child">Child content</div>
      </Card>,
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("should handle click events", () => {
    const onClick = vi.fn();
    render(<Card onClick={onClick} />);

    const card = screen.getByRole("button");
    fireEvent.click(card);

    expect(onClick).toHaveBeenCalled();
  });

  it("should handle keyboard events", () => {
    const onClick = vi.fn();
    render(<Card onClick={onClick} />);

    const card = screen.getByRole("button");
    fireEvent.keyDown(card, { key: "Enter" });
    expect(onClick).toHaveBeenCalled();

    fireEvent.keyDown(card, { key: " " });
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it("should not be clickable when disabled", () => {
    const onClick = vi.fn();
    const { container } = render(<Card onClick={onClick} disabled />);

    const card = screen.queryByRole("button");
    expect(card).not.toBeInTheDocument();

    const cardDiv = container.firstChild as HTMLElement;
    expect(cardDiv.className).toContain("disabled");
    fireEvent.click(cardDiv);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("should show checkmark when selected", () => {
    const { container } = render(<Card selected />);

    const checkmark = container.querySelector("svg");
    expect(checkmark).toBeInTheDocument();
  });

  it("should apply variant classes", () => {
    const { rerender, container } = render(<Card variant="gradient" />);
    let card = container.firstChild as HTMLElement;
    expect(card.className).toContain("gradient");

    rerender(<Card variant="outlined" />);
    card = container.firstChild as HTMLElement;
    expect(card.className).toContain("outlined");
  });

  it("should apply custom className", () => {
    const { container } = render(<Card className="custom-class" />);
    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass("custom-class");
  });

  it("should have proper accessibility attributes when clickable", () => {
    render(<Card onClick={() => {}} />);
    const card = screen.getByRole("button");
    expect(card).toHaveAttribute("tabIndex", "0");
  });

  it("should render all parts together", () => {
    const onClick = vi.fn();
    const TestIcon = <div data-testid="test-icon">Icon</div>;

    render(
      <Card title="Test Title" description="Test Description" icon={TestIcon} selected onClick={onClick} variant="gradient" className="custom-class">
        <div data-testid="child">Child content</div>
      </Card>,
    );

    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("Test Description")).toBeInTheDocument();
    expect(screen.getByTestId("test-icon")).toBeInTheDocument();
    expect(screen.getByTestId("child")).toBeInTheDocument();

    const card = screen.getByRole("button");
    expect(card.className).toContain("gradient");
    expect(card.className).toContain("custom-class");
    expect(card.className).toContain("selected");

    fireEvent.click(card);
    expect(onClick).toHaveBeenCalled();
  });
});
