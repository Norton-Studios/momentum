import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { Header } from "./header";

describe("Header", () => {
  it("renders logo", () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    expect(screen.getByText(/Momentum/)).toBeInTheDocument();
  });

  it("renders all navigation links", () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: "Features" })).toHaveAttribute("href", "/#features");
    expect(screen.getByRole("link", { name: "Metrics" })).toHaveAttribute("href", "/#metrics");
    expect(screen.getByRole("link", { name: "Pricing" })).toHaveAttribute("href", "/#pricing");
    expect(screen.getByRole("link", { name: "Docs" })).toHaveAttribute("href", "/#docs");
    expect(screen.getByRole("link", { name: "Sign In" })).toHaveAttribute("href", "/login");
  });

  it("renders Get Started button with link to register", () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    const registerLink = screen.getByRole("link", { name: /Get Started/i });
    expect(registerLink).toHaveAttribute("href", "/register");

    const button = screen.getByRole("button", { name: "Get Started" });
    expect(button).toBeInTheDocument();
  });

  it("renders within header element", () => {
    const { container } = render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    const header = container.querySelector("header");
    expect(header).toBeInTheDocument();
    expect(header).toHaveClass("header");
  });

  it("renders nav element", () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });
});
