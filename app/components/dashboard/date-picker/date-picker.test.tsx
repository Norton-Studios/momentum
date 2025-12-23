import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockNavigate = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useSearchParams: () => [mockSearchParams, vi.fn()],
    useNavigate: () => mockNavigate,
  };
});

import { DatePicker } from "./date-picker";

describe("DatePicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
  });

  it("renders all preset buttons", () => {
    render(
      <MemoryRouter>
        <DatePicker />
      </MemoryRouter>
    );

    expect(screen.getByRole("button", { name: "7d" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "30d" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "60d" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "90d" })).toBeInTheDocument();
  });

  it("renders custom date button", () => {
    render(
      <MemoryRouter>
        <DatePicker />
      </MemoryRouter>
    );

    expect(screen.getByRole("button", { name: "Custom" })).toBeInTheDocument();
  });

  it("shows 30d as active by default when no preset in URL", () => {
    render(
      <MemoryRouter>
        <DatePicker />
      </MemoryRouter>
    );

    const button30d = screen.getByRole("button", { name: "30d" });
    expect(button30d).toHaveClass("active");
  });

  it("shows correct preset as active based on URL params", () => {
    mockSearchParams = new URLSearchParams({ preset: "7d" });

    render(
      <MemoryRouter>
        <DatePicker />
      </MemoryRouter>
    );

    const button7d = screen.getByRole("button", { name: "7d" });
    const button30d = screen.getByRole("button", { name: "30d" });
    expect(button7d).toHaveClass("active");
    expect(button30d).not.toHaveClass("active");
  });

  it("navigates with preset param when preset button is clicked", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <DatePicker />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: "7d" }));

    expect(mockNavigate).toHaveBeenCalledWith("?preset=7d");
  });

  it("navigates with correct preset for each button", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <DatePicker />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: "60d" }));
    expect(mockNavigate).toHaveBeenCalledWith("?preset=60d");

    await user.click(screen.getByRole("button", { name: "90d" }));
    expect(mockNavigate).toHaveBeenCalledWith("?preset=90d");
  });

  it("opens custom date modal when Custom button is clicked", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <DatePicker />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: "Custom" }));

    expect(screen.getByLabelText("Start Date")).toBeInTheDocument();
    expect(screen.getByLabelText("End Date")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply" })).toBeInTheDocument();
  });

  it("closes custom date modal when Custom button is clicked again", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <DatePicker />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: "Custom" }));
    expect(screen.getByLabelText("Start Date")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Custom" }));
    expect(screen.queryByLabelText("Start Date")).not.toBeInTheDocument();
  });

  it("closes modal when clicking outside", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <div data-testid="outside">
          <DatePicker />
        </div>
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: "Custom" }));
    expect(screen.getByLabelText("Start Date")).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId("outside"));

    await waitFor(() => {
      expect(screen.queryByLabelText("Start Date")).not.toBeInTheDocument();
    });
  });

  it("does not close modal when clicking inside", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <DatePicker />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: "Custom" }));
    const startInput = screen.getByLabelText("Start Date");
    fireEvent.mouseDown(startInput);

    expect(screen.getByLabelText("Start Date")).toBeInTheDocument();
  });

  it("disables Apply button when no dates are selected", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <DatePicker />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: "Custom" }));

    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
  });

  it("disables Apply button when only start date is selected", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <DatePicker />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: "Custom" }));
    await user.type(screen.getByLabelText("Start Date"), "2025-01-01");

    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
  });

  it("enables Apply button when valid date range is selected", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <DatePicker />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: "Custom" }));
    await user.type(screen.getByLabelText("Start Date"), "2025-01-01");
    await user.type(screen.getByLabelText("End Date"), "2025-01-15");

    expect(screen.getByRole("button", { name: "Apply" })).not.toBeDisabled();
  });

  it("disables Apply button when start date is after end date", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <DatePicker />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: "Custom" }));
    await user.type(screen.getByLabelText("Start Date"), "2025-01-15");
    await user.type(screen.getByLabelText("End Date"), "2025-01-01");

    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
  });

  it("navigates with custom date range when Apply is clicked", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <DatePicker />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: "Custom" }));
    await user.type(screen.getByLabelText("Start Date"), "2025-01-01");
    await user.type(screen.getByLabelText("End Date"), "2025-01-15");
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(mockNavigate).toHaveBeenCalledWith("?start=2025-01-01&end=2025-01-15");
  });

  it("closes modal after applying custom date range", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <DatePicker />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: "Custom" }));
    await user.type(screen.getByLabelText("Start Date"), "2025-01-01");
    await user.type(screen.getByLabelText("End Date"), "2025-01-15");
    await user.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() => {
      expect(screen.queryByLabelText("Start Date")).not.toBeInTheDocument();
    });
  });

  it("shows formatted date range on Custom button when custom preset is active", () => {
    mockSearchParams = new URLSearchParams({
      start: "2025-01-01",
      end: "2025-01-15",
    });

    render(
      <MemoryRouter>
        <DatePicker />
      </MemoryRouter>
    );

    const customButton = screen.getByRole("button", { name: /Jan/ });
    expect(customButton).toHaveClass("active");
    expect(customButton).toHaveTextContent("Jan");
    expect(customButton).toHaveTextContent("2025");
  });

  it("pre-fills date inputs when custom range is in URL", async () => {
    const user = userEvent.setup();
    mockSearchParams = new URLSearchParams({
      start: "2025-01-01",
      end: "2025-01-15",
    });

    render(
      <MemoryRouter>
        <DatePicker />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: /Jan/ }));

    expect(screen.getByLabelText("Start Date")).toHaveValue("2025-01-01");
    expect(screen.getByLabelText("End Date")).toHaveValue("2025-01-15");
  });

  it("does not navigate when Apply is clicked with empty dates", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <DatePicker />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: "Custom" }));
    const applyButton = screen.getByRole("button", { name: "Apply" });

    await user.click(applyButton);

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("has correct max attribute on end date input", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <DatePicker />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: "Custom" }));

    const endInput = screen.getByLabelText("End Date");
    const today = new Date().toISOString().split("T")[0];
    expect(endInput).toHaveAttribute("max", today);
  });

  it("constrains start date max to selected end date", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <DatePicker />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: "Custom" }));
    await user.type(screen.getByLabelText("End Date"), "2025-01-15");

    const startInput = screen.getByLabelText("Start Date");
    expect(startInput).toHaveAttribute("max", "2025-01-15");
  });

  it("constrains end date min to selected start date", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <DatePicker />
      </MemoryRouter>
    );

    await user.click(screen.getByRole("button", { name: "Custom" }));
    await user.type(screen.getByLabelText("Start Date"), "2025-01-01");

    const endInput = screen.getByLabelText("End Date");
    expect(endInput).toHaveAttribute("min", "2025-01-01");
  });

  it("applies date-picker class to container", () => {
    const { container } = render(
      <MemoryRouter>
        <DatePicker />
      </MemoryRouter>
    );

    expect(container.querySelector(".date-picker")).toBeInTheDocument();
  });

  it("applies date-btn class to preset buttons", () => {
    render(
      <MemoryRouter>
        <DatePicker />
      </MemoryRouter>
    );

    const buttons = screen.getAllByRole("button");
    for (const button of buttons) {
      expect(button).toHaveClass("date-btn");
    }
  });
});
