import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MetricCard } from "./MetricCard";

describe("MetricCard", () => {
  it("should render basic metric card", () => {
    render(<MetricCard title="Test Metric" value="100" />);

    expect(screen.getByText("Test Metric")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("should render with numeric value", () => {
    render(<MetricCard title="Count" value={42} />);

    expect(screen.getByText("Count")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("should render with icon", () => {
    const TestIcon = <span data-testid="test-icon">📊</span>;
    render(<MetricCard title="Metric" value="100" icon={TestIcon} />);

    const icon = screen.getByTestId("test-icon");
    expect(icon).toBeInTheDocument();
  });

  it("should render upward trend with positive styling", () => {
    render(<MetricCard title="Performance" value="95%" trend={{ value: 5, direction: "up" }} />);

    expect(screen.getByText("↑")).toBeInTheDocument();
    expect(screen.getByText("5%")).toBeInTheDocument();

    const trendElement = screen.getByText("↑").parentElement;
    expect(trendElement?.className).toContain("positive");
  });

  it("should render downward trend with negative styling", () => {
    render(<MetricCard title="Performance" value="85%" trend={{ value: 10, direction: "down" }} />);

    expect(screen.getByText("↓")).toBeInTheDocument();
    expect(screen.getByText("10%")).toBeInTheDocument();

    const trendElement = screen.getByText("↓").parentElement;
    expect(trendElement?.className).toContain("negative");
  });

  it("should handle CVE gradient with inverted trend logic", () => {
    // For CVE, down is positive (fewer vulnerabilities is good)
    render(<MetricCard title="CVE Count" value="2" gradient="cve" trend={{ value: 50, direction: "down" }} />);

    const trendElement = screen.getByText("↓").parentElement;
    expect(trendElement?.className).toContain("positive");
  });

  it("should handle CVE gradient with up trend as negative", () => {
    // For CVE, up is negative (more vulnerabilities is bad)
    render(<MetricCard title="CVE Count" value="8" gradient="cve" trend={{ value: 25, direction: "up" }} />);

    const trendElement = screen.getByText("↑").parentElement;
    expect(trendElement?.className).toContain("negative");
  });

  it("should apply gradient classes", () => {
    const { container, rerender } = render(<MetricCard title="Test" value="100" gradient="velocity" />);

    let card = container.firstChild as HTMLElement;
    expect(card.className).toContain("velocity");

    rerender(<MetricCard title="Test" value="100" gradient="stability" />);
    card = container.firstChild as HTMLElement;
    expect(card.className).toContain("stability");
  });

  it("should render sparkline chart", () => {
    const sparklineData = [10, 20, 15, 30, 25];
    render(<MetricCard title="Trend" value="25" sparklineData={sparklineData} />);

    const sparkline = screen.getByRole("img", { hidden: true }); // SVG has img role
    expect(sparkline).toBeInTheDocument();

    const polyline = sparkline.querySelector("polyline");
    expect(polyline).toBeInTheDocument();
    expect(polyline).toHaveAttribute("points");
  });

  it("should calculate sparkline points correctly", () => {
    const sparklineData = [0, 10, 20, 30];
    render(<MetricCard title="Test" value="30" sparklineData={sparklineData} />);

    const polyline = screen.getByRole("img", { hidden: true }).querySelector("polyline");
    const points = polyline?.getAttribute("points");

    // Should have 4 points for 4 data values
    expect(points?.split(" ")).toHaveLength(4);
    // First point should start at x=0
    expect(points?.startsWith("0,")).toBe(true);
    // Last point should end at x=100
    expect(points?.includes("100,")).toBe(true);
  });

  it("should apply custom className", () => {
    const { container } = render(<MetricCard title="Test" value="100" className="custom-metric" />);

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass("custom-metric");
  });

  it("should use primary gradient by default", () => {
    const { container } = render(<MetricCard title="Test" value="100" />);

    const card = container.firstChild as HTMLElement;
    expect(card.className).toContain("primary");
  });

  it("should not render trend when not provided", () => {
    render(<MetricCard title="Test" value="100" />);

    expect(screen.queryByText("↑")).not.toBeInTheDocument();
    expect(screen.queryByText("↓")).not.toBeInTheDocument();
  });

  it("should not render sparkline when data not provided", () => {
    render(<MetricCard title="Test" value="100" />);

    expect(screen.queryByRole("img", { hidden: true })).not.toBeInTheDocument();
  });

  it("should handle all gradient types", () => {
    const gradients = ["cve", "stability", "velocity", "performance", "primary"] as const;

    gradients.forEach((gradient) => {
      const { container } = render(<MetricCard title="Test" value="100" gradient={gradient} />);
      const card = container.firstChild as HTMLElement;
      expect(card.className).toContain(gradient);
    });
  });

  it("should render complete metric card with all features", () => {
    const TestIcon = <span data-testid="complete-icon">🎯</span>;
    const sparklineData = [10, 15, 12, 20, 18];

    render(
      <MetricCard
        title="Complete Metric"
        value="18"
        gradient="performance"
        icon={TestIcon}
        trend={{ value: 25, direction: "up" }}
        sparklineData={sparklineData}
        className="complete-card"
      />,
    );

    expect(screen.getByText("Complete Metric")).toBeInTheDocument();
    expect(screen.getByText("18")).toBeInTheDocument();
    expect(screen.getByTestId("complete-icon")).toBeInTheDocument();
    expect(screen.getByText("↑")).toBeInTheDocument();
    expect(screen.getByText("25%")).toBeInTheDocument();
    expect(screen.getByRole("img", { hidden: true })).toBeInTheDocument();

    const card = screen.getByText("Complete Metric").closest("div");
    expect(card).toHaveClass("complete-card");
    expect(card?.className).toContain("performance");
  });
});
