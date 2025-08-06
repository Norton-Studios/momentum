import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SSOButton } from "./SSOButton";

describe("SSOButton", () => {
  it("should render Google SSO button with default label", () => {
    const { container } = render(<SSOButton provider="google" />);

    expect(screen.getByText("Continue with Google")).toBeInTheDocument();

    const button = screen.getByRole("button");
    expect(button.className).toContain("google");

    const icon = container.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });

  it("should render Microsoft SSO button", () => {
    const { container } = render(<SSOButton provider="microsoft" />);

    expect(screen.getByText("Continue with Microsoft")).toBeInTheDocument();

    const button = screen.getByRole("button");
    expect(button.className).toContain("microsoft");

    const icon = container.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });

  it("should render GitHub SSO button", () => {
    const { container } = render(<SSOButton provider="github" />);

    expect(screen.getByText("Continue with GitHub")).toBeInTheDocument();

    const button = screen.getByRole("button");
    expect(button.className).toContain("github");

    const icon = container.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });

  it("should render GitLab SSO button", () => {
    const { container } = render(<SSOButton provider="gitlab" />);

    expect(screen.getByText("Continue with GitLab")).toBeInTheDocument();

    const button = screen.getByRole("button");
    expect(button.className).toContain("gitlab");

    const icon = container.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });

  it("should render Bitbucket SSO button", () => {
    const { container } = render(<SSOButton provider="bitbucket" />);

    expect(screen.getByText("Continue with Bitbucket")).toBeInTheDocument();

    const button = screen.getByRole("button");
    expect(button.className).toContain("bitbucket");

    const icon = container.querySelector("svg");
    expect(icon).toBeInTheDocument();
  });

  it("should render custom label when provided", () => {
    render(<SSOButton provider="google">Sign in with Google</SSOButton>);

    expect(screen.getByText("Sign in with Google")).toBeInTheDocument();
    expect(screen.queryByText("Continue with Google")).not.toBeInTheDocument();
  });

  it("should apply fullWidth class when fullWidth is true", () => {
    render(<SSOButton provider="google" fullWidth />);

    const button = screen.getByRole("button");
    expect(button.className).toContain("fullWidth");
  });

  it("should not apply fullWidth class by default", () => {
    render(<SSOButton provider="google" />);

    const button = screen.getByRole("button");
    expect(button.className).not.toContain("fullWidth");
  });

  it("should apply custom className", () => {
    render(<SSOButton provider="google" className="custom-sso-btn" />);

    const button = screen.getByRole("button");
    expect(button).toHaveClass("custom-sso-btn");
  });

  it("should handle click events", () => {
    const onClick = vi.fn();
    render(<SSOButton provider="google" onClick={onClick} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("should pass through button props", () => {
    render(<SSOButton provider="google" disabled data-testid="sso-button" />);

    const button = screen.getByTestId("sso-button");
    expect(button).toBeDisabled();
  });

  it("should render icon and label in correct structure", () => {
    const { container } = render(<SSOButton provider="github" />);

    const button = screen.getByRole("button");
    const icon = button.querySelector("svg");
    const label = screen.getByText("Continue with GitHub");

    expect(icon).toBeInTheDocument();
    expect(label).toBeInTheDocument();
    expect(label).toHaveTextContent("Continue with GitHub");
  });

  it("should maintain button structure with custom content", () => {
    render(<SSOButton provider="microsoft">Custom Label</SSOButton>);

    const button = screen.getByRole("button");
    const icon = button.querySelector("svg");
    const label = screen.getByText("Custom Label");

    expect(icon).toBeInTheDocument();
    expect(label).toBeInTheDocument();
    expect(label).toHaveTextContent("Custom Label");
  });

  it("should apply provider-specific styling", () => {
    const { rerender } = render(<SSOButton provider="google" />);
    let button = screen.getByRole("button");
    expect(button.className).toContain("google");

    rerender(<SSOButton provider="microsoft" />);
    button = screen.getByRole("button");
    expect(button.className).toContain("microsoft");
    expect(button.className).not.toContain("google");
  });

  it("should support keyboard navigation", () => {
    const onClick = vi.fn();
    render(<SSOButton provider="google" onClick={onClick} />);

    const button = screen.getByRole("button");

    // Should be focusable
    button.focus();
    expect(document.activeElement).toBe(button);

    // Buttons respond to click events, not keydown for Enter/Space
    // The browser handles Enter/Space -> click conversion for buttons
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("should render all provider configurations correctly", () => {
    const providers = ["google", "microsoft", "github", "gitlab", "bitbucket"] as const;
    const expectedLabels = ["Continue with Google", "Continue with Microsoft", "Continue with GitHub", "Continue with GitLab", "Continue with Bitbucket"];

    providers.forEach((provider, index) => {
      const { container, unmount } = render(<SSOButton provider={provider} />);

      expect(screen.getByText(expectedLabels[index])).toBeInTheDocument();

      const button = screen.getByRole("button");
      expect(button.className).toContain(provider);

      const icon = container.querySelector("svg");
      expect(icon).toBeInTheDocument();

      unmount();
    });
  });

  it("should combine all modifier classes correctly", () => {
    render(<SSOButton provider="google" fullWidth className="custom-class another-class" disabled />);

    const button = screen.getByRole("button");
    expect(button.className).toContain("ssoButton");
    expect(button.className).toContain("google");
    expect(button.className).toContain("fullWidth");
    expect(button).toHaveClass("custom-class");
    expect(button).toHaveClass("another-class");
    expect(button).toBeDisabled();
  });

  it("should work as a form submit button", () => {
    render(
      <form>
        <SSOButton provider="github" type="submit">
          Submit with GitHub
        </SSOButton>
      </form>,
    );

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("type", "submit");

    // Test that the button has the correct type, form submission is handled by browser
    expect(button.type).toBe("submit");
  });
});
