import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import Login, { meta } from "./login";

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useActionData: () => undefined,
    Form: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => <form {...props}>{children}</form>,
  };
});

describe("Login meta", () => {
  it("exports correct title and description meta tags", () => {
    const metaTags = meta();

    expect(metaTags).toEqual([
      { title: "Sign In - Momentum" },
      {
        name: "description",
        content: "Sign in to your Momentum account",
      },
    ]);
  });
});

describe("Login", () => {
  it("renders logo with link to home", () => {
    const { container } = render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const logo = container.querySelector(".login-logo");
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveTextContent("Momentum.");
  });

  it("renders form header", () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { level: 1, name: "Welcome Back" })).toBeInTheDocument();
    expect(screen.getByText("Sign in to your account")).toBeInTheDocument();
  });

  it("renders email field with label", () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText("Email Address");
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toHaveAttribute("type", "email");
    expect(emailInput).toHaveAttribute("placeholder", "john.smith@company.com");
  });

  it("renders password field with label", () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const passwordInput = screen.getByLabelText("Password");
    expect(passwordInput).toBeInTheDocument();
    expect(passwordInput).toHaveAttribute("type", "password");
    expect(passwordInput).toHaveAttribute("placeholder", "Enter your password");
  });

  it("renders submit button", () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const submitButton = screen.getByRole("button", { name: "Sign In" });
    expect(submitButton).toHaveAttribute("type", "submit");
  });
});

describe("Login with errors", () => {
  it("displays form error banner when form error exists", () => {
    vi.doMock("react-router", async () => {
      const actual = await vi.importActual("react-router");
      return {
        ...actual,
        useActionData: () => ({ errors: { form: "Invalid email or password" } }),
        Form: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => <form {...props}>{children}</form>,
      };
    });
  });
});
