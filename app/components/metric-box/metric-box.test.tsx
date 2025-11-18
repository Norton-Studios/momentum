import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MetricBox } from "./metric-box";

describe("MetricBox", () => {
  it("renders label", () => {
    render(<MetricBox label="Total Users" value={100} />);

    expect(screen.getByText("Total Users")).toBeInTheDocument();
  });

  it("renders string value", () => {
    render(<MetricBox label="Status" value="Active" />);

    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("renders numeric value", () => {
    render(<MetricBox label="Count" value={42} />);

    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("does not render trend when not provided", () => {
    const { container } = render(<MetricBox label="Test" value={100} />);

    const trend = container.querySelector(".metric-trend");
    expect(trend).not.toBeInTheDocument();
  });

  it("renders trend when provided", () => {
    render(<MetricBox label="Test" value={100} trend="+15%" />);

    expect(screen.getByText("+15%")).toBeInTheDocument();
  });

  it("applies neutral trend type by default when trend is provided", () => {
    const { container } = render(<MetricBox label="Test" value={100} trend="+15%" />);

    const trend = container.querySelector(".metric-trend");
    expect(trend).toHaveClass("neutral");
  });

  it("applies positive trend type when specified", () => {
    const { container } = render(<MetricBox label="Test" value={100} trend="+15%" trendType="positive" />);

    const trend = container.querySelector(".metric-trend");
    expect(trend).toHaveClass("positive");
  });

  it("applies negative trend type when specified", () => {
    const { container } = render(<MetricBox label="Test" value={100} trend="-5%" trendType="negative" />);

    const trend = container.querySelector(".metric-trend");
    expect(trend).toHaveClass("negative");
  });

  it("applies correct CSS classes to container and elements", () => {
    const { container } = render(<MetricBox label="Users" value={1000} trend="+10%" trendType="positive" />);

    expect(container.querySelector(".metric-box")).toBeInTheDocument();
    expect(container.querySelector(".metric-label")).toHaveTextContent("Users");
    expect(container.querySelector(".metric-value")).toHaveTextContent("1000");
    expect(container.querySelector(".metric-trend")).toHaveTextContent("+10%");
  });
});
