import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { Footer } from "./footer";

describe("Footer", () => {
  it("renders brand name with period", () => {
    const { container } = render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

    const brand = container.querySelector(".footer-brand");
    expect(brand).toHaveTextContent("Momentum.");
  });

  it("renders brand description", () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

    expect(screen.getByText(/The premier platform for measuring and improving developer productivity/)).toBeInTheDocument();
  });

  it("renders Product section with all links", () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "Product" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Features" })).toHaveAttribute("href", "/#features");
    expect(screen.getByRole("link", { name: "Metrics" })).toHaveAttribute("href", "/#metrics");
    expect(screen.getByRole("link", { name: "Pricing" })).toHaveAttribute("href", "/#pricing");
    expect(screen.getByRole("link", { name: "Integrations" })).toHaveAttribute("href", "/#integrations");
  });

  it("renders Resources section with all links", () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "Resources" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Documentation" })).toHaveAttribute("href", "/#docs");
    expect(screen.getByRole("link", { name: "Getting Started" })).toHaveAttribute("href", "/#guides");
    expect(screen.getByRole("link", { name: "API Reference" })).toHaveAttribute("href", "/#api");
    expect(screen.getByRole("link", { name: "Support" })).toHaveAttribute("href", "/#support");
  });

  it("renders Company section with all links", () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: "Company" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "About Us" })).toHaveAttribute("href", "/#about");
    expect(screen.getByRole("link", { name: "Blog" })).toHaveAttribute("href", "/#blog");
    expect(screen.getByRole("link", { name: "Careers" })).toHaveAttribute("href", "/#careers");
    expect(screen.getByRole("link", { name: "Contact" })).toHaveAttribute("href", "/#contact");
  });

  it("renders copyright notice", () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

    expect(screen.getByText(/© 2025 Momentum. All rights reserved./)).toBeInTheDocument();
  });

  it("renders within footer element", () => {
    const { container } = render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

    const footer = container.querySelector("footer");
    expect(footer).toBeInTheDocument();
    expect(footer).toHaveClass("footer");
  });

  it("renders footer bottom section", () => {
    const { container } = render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>
    );

    const footerBottom = container.querySelector(".footer-bottom");
    expect(footerBottom).toBeInTheDocument();
  });
});
