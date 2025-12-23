import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import Settings, { meta } from "./settings";

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useLoaderData: () => ({
      organization: {
        id: "org-1",
        name: "Test Organization",
        displayName: "Test Org Display",
        description: "Test description",
        website: "https://test.com",
        logoUrl: "https://test.com/logo.png",
      },
    }),
    useActionData: () => undefined,
    Form: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => <form {...props}>{children}</form>,
  };
});

describe("Settings meta", () => {
  it("exports correct title and description meta tags", () => {
    const metaTags = meta();

    expect(metaTags).toEqual([{ title: "General Settings - Momentum" }, { name: "description", content: "Manage your organization details" }]);
  });
});

describe("Settings", () => {
  it("renders settings layout with general tab active", () => {
    const { container } = render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    const activeTab = container.querySelector(".settings-tab.active");
    expect(activeTab).toBeInTheDocument();
    expect(activeTab).toHaveTextContent("General");
  });

  it("renders organization details section", () => {
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    expect(screen.getByText("Organization Details")).toBeInTheDocument();
    expect(screen.getByText("Update your organization information and branding")).toBeInTheDocument();
  });

  it("renders form with all input fields", () => {
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    expect(screen.getByLabelText(/Organization Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Display Name/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Website/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Logo URL/)).toBeInTheDocument();
  });

  it("populates form fields with organization data", () => {
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    const nameInput = screen.getByLabelText(/Organization Name/) as HTMLInputElement;
    const displayNameInput = screen.getByLabelText(/Display Name/) as HTMLInputElement;
    const descriptionInput = screen.getByLabelText(/Description/) as HTMLTextAreaElement;
    const websiteInput = screen.getByLabelText(/Website/) as HTMLInputElement;
    const logoUrlInput = screen.getByLabelText(/Logo URL/) as HTMLInputElement;

    expect(nameInput.value).toBe("Test Organization");
    expect(displayNameInput.value).toBe("Test Org Display");
    expect(descriptionInput.value).toBe("Test description");
    expect(websiteInput.value).toBe("https://test.com");
    expect(logoUrlInput.value).toBe("https://test.com/logo.png");
  });

  it("renders name field as required", () => {
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    const nameInput = screen.getByLabelText(/Organization Name/);
    expect(nameInput).toHaveAttribute("required");
  });

  it("renders website and logo URL fields with correct type", () => {
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    const websiteInput = screen.getByLabelText(/Website/);
    const logoUrlInput = screen.getByLabelText(/Logo URL/);

    expect(websiteInput).toHaveAttribute("type", "url");
    expect(logoUrlInput).toHaveAttribute("type", "url");
  });

  it("renders submit button", () => {
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    const submitButton = screen.getByRole("button", { name: "Save Changes" });
    expect(submitButton).toHaveAttribute("type", "submit");
  });

  it("includes hidden intent field", () => {
    const { container } = render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    const intentInput = container.querySelector('input[name="intent"]') as HTMLInputElement;
    expect(intentInput).toBeInTheDocument();
    expect(intentInput.value).toBe("update-organization");
    expect(intentInput.type).toBe("hidden");
  });
});
