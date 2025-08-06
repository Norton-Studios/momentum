import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { RepositoryCard } from "./RepositoryCard";

describe("RepositoryCard", () => {
  const basicProps = {
    name: "my-repo",
    description: "A sample repository",
  };

  it("should render basic repository card", () => {
    render(<RepositoryCard {...basicProps} />);

    expect(screen.getByText("my-repo")).toBeInTheDocument();
    expect(screen.getByText("A sample repository")).toBeInTheDocument();
  });

  it("should render without description", () => {
    render(<RepositoryCard name="simple-repo" />);

    expect(screen.getByText("simple-repo")).toBeInTheDocument();
    expect(screen.queryByText("A sample repository")).not.toBeInTheDocument();
  });

  it("should render visibility indicator", () => {
    const { rerender } = render(<RepositoryCard {...basicProps} visibility="public" />);
    expect(screen.getByText("🌐")).toBeInTheDocument();
    expect(screen.getByText("public")).toBeInTheDocument();

    rerender(<RepositoryCard {...basicProps} visibility="private" />);
    expect(screen.getByText("🔒")).toBeInTheDocument();
    expect(screen.getByText("private")).toBeInTheDocument();
  });

  it("should default to public visibility", () => {
    render(<RepositoryCard {...basicProps} />);

    expect(screen.getByText("🌐")).toBeInTheDocument();
    expect(screen.getByText("public")).toBeInTheDocument();
  });

  it("should render language information", () => {
    const { container } = render(<RepositoryCard {...basicProps} language="TypeScript" languageColor="#3178c6" />);

    expect(screen.getByText("TypeScript")).toBeInTheDocument();

    const languageDot = container.querySelector(".languageDot");
    expect(languageDot).toHaveStyle("background-color: #3178c6");
  });

  it("should use default language color", () => {
    const { container } = render(<RepositoryCard {...basicProps} language="JavaScript" />);

    expect(screen.getByText("JavaScript")).toBeInTheDocument();

    const languageDot = container.querySelector(".languageDot");
    expect(languageDot).toHaveStyle("background-color: #333");
  });

  it("should render star count", () => {
    render(<RepositoryCard {...basicProps} stars={42} />);

    expect(screen.getByText("⭐")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("should render zero stars", () => {
    render(<RepositoryCard {...basicProps} stars={0} />);

    expect(screen.getByText("⭐")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("should render last updated information", () => {
    render(<RepositoryCard {...basicProps} lastUpdated="2 days ago" />);

    expect(screen.getByText("Updated 2 days ago")).toBeInTheDocument();
  });

  it("should render selection checkbox when onSelectionChange provided", () => {
    const onSelectionChange = vi.fn();
    render(<RepositoryCard {...basicProps} onSelectionChange={onSelectionChange} />);

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).toHaveAttribute("aria-label", "Select repository my-repo");
  });

  it("should not render checkbox when onSelectionChange not provided", () => {
    render(<RepositoryCard {...basicProps} />);

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("should handle checkbox selection", () => {
    const onSelectionChange = vi.fn();
    render(<RepositoryCard {...basicProps} onSelectionChange={onSelectionChange} />);

    const checkbox = screen.getByRole("checkbox");
    fireEvent.change(checkbox, { target: { checked: true } });

    expect(onSelectionChange).toHaveBeenCalledWith(true);
  });

  it("should reflect selected state in checkbox", () => {
    const onSelectionChange = vi.fn();
    render(<RepositoryCard {...basicProps} selected onSelectionChange={onSelectionChange} />);

    const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it("should apply selected styling", () => {
    const { container } = render(<RepositoryCard {...basicProps} selected />);

    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("selected");
  });

  it("should apply custom className", () => {
    const { container } = render(<RepositoryCard {...basicProps} className="custom-repo-card" />);

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass("custom-repo-card");
  });

  it("should render complete repository card with all features", () => {
    const onSelectionChange = vi.fn();
    const { container } = render(
      <RepositoryCard
        name="awesome-project"
        description="An awesome open source project"
        language="TypeScript"
        languageColor="#3178c6"
        visibility="public"
        lastUpdated="1 hour ago"
        stars={1234}
        selected
        onSelectionChange={onSelectionChange}
        className="featured-repo"
      />,
    );

    expect(screen.getByText("awesome-project")).toBeInTheDocument();
    expect(screen.getByText("An awesome open source project")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("🌐")).toBeInTheDocument();
    expect(screen.getByText("public")).toBeInTheDocument();
    expect(screen.getByText("⭐")).toBeInTheDocument();
    expect(screen.getByText("1234")).toBeInTheDocument();
    expect(screen.getByText("Updated 1 hour ago")).toBeInTheDocument();

    const checkbox = screen.getByRole("checkbox") as HTMLInputElement;
    expect(checkbox.checked).toBe(true);

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass("featured-repo");
    expect(card.className).toContain("selected");

    const languageDot = container.querySelector(".languageDot");
    expect(languageDot).toHaveStyle("background-color: #3178c6");
  });

  it("should handle metadata sections independently", () => {
    const { rerender } = render(<RepositoryCard name="test-repo" />);

    // No metadata should render empty metadata section
    expect(screen.queryByText("⭐")).not.toBeInTheDocument();
    expect(screen.queryByText("Updated")).not.toBeInTheDocument();

    // Only language
    rerender(<RepositoryCard name="test-repo" language="Python" />);
    expect(screen.getByText("Python")).toBeInTheDocument();
    expect(screen.queryByText("⭐")).not.toBeInTheDocument();

    // Only stars
    rerender(<RepositoryCard name="test-repo" stars={5} />);
    expect(screen.getByText("⭐")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.queryByText("Python")).not.toBeInTheDocument();

    // Only last updated
    rerender(<RepositoryCard name="test-repo" lastUpdated="yesterday" />);
    expect(screen.getByText("Updated yesterday")).toBeInTheDocument();
    expect(screen.queryByText("⭐")).not.toBeInTheDocument();
  });
});
