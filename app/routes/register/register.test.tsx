import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import Register, { meta } from "./register";

describe("Register meta", () => {
  it("exports correct title and description meta tags", () => {
    const metaTags = meta();

    expect(metaTags).toEqual([
      { title: "Create Account - Momentum" },
      {
        name: "description",
        content: "Join development teams using Momentum to track productivity",
      },
    ]);
  });
});

describe("Register", () => {
  it("renders logo with link to home", () => {
    const { container } = render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    const logo = container.querySelector(".register-logo");
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveTextContent("Momentum.");
  });

  it("renders main heading and benefits section", () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { level: 2, name: "Measure What Matters" })).toBeInTheDocument();
    expect(screen.getByText(/Join development teams using Momentum to track productivity/)).toBeInTheDocument();
  });

  it("renders all benefit items", () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    expect(screen.getByText("Comprehensive Analytics")).toBeInTheDocument();
    expect(screen.getByText("Track metrics across your entire development workflow")).toBeInTheDocument();

    expect(screen.getByText("Self-Hosted Control")).toBeInTheDocument();
    expect(screen.getByText("Deploy to your infrastructure. Your data stays with you")).toBeInTheDocument();

    expect(screen.getByText("Unlimited Integrations")).toBeInTheDocument();
    expect(screen.getByText("Connect to GitHub, GitLab, Jenkins, JIRA, and more")).toBeInTheDocument();
  });

  it("renders form header", () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { level: 1, name: "Create Account" })).toBeInTheDocument();
    expect(screen.getByText("Start your free trial today")).toBeInTheDocument();
  });

  it("renders all form fields with labels", () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    expect(screen.getByLabelText("First Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Last Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email Address")).toBeInTheDocument();
    expect(screen.getByLabelText("Organization Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("renders form fields with correct types and placeholders", () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    const firstNameInput = screen.getByLabelText("First Name");
    expect(firstNameInput).toHaveAttribute("type", "text");
    expect(firstNameInput).toHaveAttribute("placeholder", "John");

    const emailInput = screen.getByLabelText("Email Address");
    expect(emailInput).toHaveAttribute("type", "email");
    expect(emailInput).toHaveAttribute("placeholder", "john.smith@company.com");

    const passwordInput = screen.getByLabelText("Password");
    expect(passwordInput).toHaveAttribute("type", "password");
    expect(passwordInput).toHaveAttribute("placeholder", "Minimum 12 characters");
  });

  it("renders form help text", () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    expect(screen.getByText("This will be used to identify your workspace")).toBeInTheDocument();
    expect(screen.getByText("Use a strong password with letters, numbers, and symbols")).toBeInTheDocument();
  });

  it("renders terms and privacy policy checkbox", () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeRequired();

    expect(screen.getByRole("link", { name: "Terms of Service" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toBeInTheDocument();
  });

  it("renders submit button", () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    const submitButton = screen.getByRole("button", { name: "Create Account" });
    expect(submitButton).toHaveAttribute("type", "submit");
  });

  it("renders social login buttons", () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    expect(screen.getByText("Or continue with")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /GitHub/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Google/ })).toBeInTheDocument();
  });

  it("renders sign in link", () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    expect(screen.getByText(/Already have an account\?/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign In" })).toHaveAttribute("href", "/login");
  });
});
