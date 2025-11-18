import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FeatureCard } from "./feature-card";

describe("FeatureCard", () => {
  it("renders feature number", () => {
    render(<FeatureCard number="01" title="Test Title" description="Test description" />);

    expect(screen.getByText("01")).toBeInTheDocument();
  });

  it("renders feature title as heading", () => {
    render(<FeatureCard number="01" title="Test Title" description="Test description" />);

    expect(screen.getByRole("heading", { level: 3, name: "Test Title" })).toBeInTheDocument();
  });

  it("renders feature description", () => {
    render(<FeatureCard number="01" title="Test Title" description="Test description" />);

    expect(screen.getByText("Test description")).toBeInTheDocument();
  });

  it("applies correct CSS classes", () => {
    const { container } = render(<FeatureCard number="01" title="Test Title" description="Test description" />);

    const card = container.querySelector(".feature-card");
    expect(card).toBeInTheDocument();

    const number = container.querySelector(".feature-number");
    expect(number).toBeInTheDocument();
    expect(number).toHaveTextContent("01");
  });

  it("renders all props together correctly", () => {
    render(<FeatureCard number="02" title="Real-time Analytics" description="Get instant insights into your development metrics" />);

    expect(screen.getByText("02")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Real-time Analytics" })).toBeInTheDocument();
    expect(screen.getByText("Get instant insights into your development metrics")).toBeInTheDocument();
  });
});
