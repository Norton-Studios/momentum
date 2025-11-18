import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { Logo } from "./logo";

describe("Logo", () => {
  it("renders logo text with period", () => {
    render(
      <MemoryRouter>
        <Logo />
      </MemoryRouter>
    );

    expect(screen.getByText(/Momentum/)).toBeInTheDocument();
    expect(screen.getByText(".")).toBeInTheDocument();
  });

  it("renders as a link to home by default", () => {
    render(
      <MemoryRouter>
        <Logo />
      </MemoryRouter>
    );

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/");
  });

  it("renders as a link to custom path when linkTo is provided", () => {
    render(
      <MemoryRouter>
        <Logo linkTo="/dashboard" />
      </MemoryRouter>
    );

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/dashboard");
  });

  it("renders without link when linkTo is empty string", () => {
    render(<Logo linkTo="" />);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText(/Momentum/)).toBeInTheDocument();
  });

  it("applies custom className to logo div", () => {
    render(
      <MemoryRouter>
        <Logo className="custom-logo" />
      </MemoryRouter>
    );

    const logoDiv = screen.getByText(/Momentum/).closest("div");
    expect(logoDiv).toHaveClass("logo", "custom-logo");
  });
});
