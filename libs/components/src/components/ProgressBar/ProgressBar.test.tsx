import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ProgressBar } from "./ProgressBar";

describe("ProgressBar", () => {
  it("should render basic progress bar", () => {
    render(<ProgressBar value={50} />);

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute("aria-valuenow", "50");
    expect(progressBar).toHaveAttribute("aria-valuemin", "0");
    expect(progressBar).toHaveAttribute("aria-valuemax", "100");
  });

  it("should calculate percentage correctly", () => {
    render(<ProgressBar value={25} max={100} />);

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveStyle("width: 25%");
  });

  it("should handle custom max value", () => {
    render(<ProgressBar value={50} max={200} />);

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveAttribute("aria-valuemax", "200");
    expect(progressBar).toHaveStyle("width: 25%"); // 50/200 = 25%
  });

  it("should clamp values to 0-100% range", () => {
    const { rerender } = render(<ProgressBar value={-10} />);
    let progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveStyle("width: 0%");

    rerender(<ProgressBar value={150} max={100} />);
    progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveStyle("width: 100%");
  });

  it("should show label when showLabel is true", () => {
    render(<ProgressBar value={75} showLabel />);

    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("should not show label by default", () => {
    render(<ProgressBar value={75} />);

    expect(screen.queryByText("75%")).not.toBeInTheDocument();
  });

  it("should apply variant classes", () => {
    const { rerender } = render(<ProgressBar value={50} variant="success" />);
    let progressBar = screen.getByRole("progressbar");
    expect(progressBar.className).toContain("success");

    rerender(<ProgressBar value={50} variant="danger" />);
    progressBar = screen.getByRole("progressbar");
    expect(progressBar.className).toContain("danger");
  });

  it("should apply size classes", () => {
    const { container, rerender } = render(<ProgressBar value={50} size="sm" />);
    let wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("sm");

    rerender(<ProgressBar value={50} size="lg" />);
    wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("lg");
  });

  it("should apply animated class when animated is true", () => {
    render(<ProgressBar value={50} animated />);

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar.className).toContain("animated");
  });

  it("should apply striped class when striped is true", () => {
    render(<ProgressBar value={50} striped />);

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar.className).toContain("striped");
  });

  it("should apply custom className", () => {
    const { container } = render(<ProgressBar value={50} className="custom-progress" />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass("custom-progress");
  });

  it("should use default values", () => {
    const { container } = render(<ProgressBar value={50} />);

    const wrapper = container.firstChild as HTMLElement;
    const progressBar = screen.getByRole("progressbar");

    expect(wrapper.className).toContain("md"); // default size
    expect(progressBar.className).toContain("default"); // default variant
    expect(progressBar).toHaveAttribute("aria-valuemax", "100"); // default max
  });

  it("should handle zero value", () => {
    render(<ProgressBar value={0} showLabel />);

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveStyle("width: 0%");
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("should handle fractional values", () => {
    render(<ProgressBar value={33.7} showLabel />);

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveStyle("width: 33.7%");
    expect(screen.getByText("34%")).toBeInTheDocument(); // rounded
  });

  it("should combine multiple modifiers", () => {
    const { container } = render(<ProgressBar value={60} variant="warning" size="lg" animated striped showLabel className="custom-bar" />);

    const wrapper = container.firstChild as HTMLElement;
    const progressBar = screen.getByRole("progressbar");

    expect(wrapper.className).toContain("lg");
    expect(wrapper).toHaveClass("custom-bar");
    expect(progressBar.className).toContain("warning");
    expect(progressBar.className).toContain("animated");
    expect(progressBar.className).toContain("striped");
    expect(screen.getByText("60%")).toBeInTheDocument();
  });

  it("should round label percentage to whole number", () => {
    render(<ProgressBar value={33.333} showLabel />);

    expect(screen.getByText("33%")).toBeInTheDocument();
  });
});
