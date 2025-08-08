import { render, screen, fireEvent } from "@testing-library/react";
import { OnboardingWizard, type WizardStep } from "./OnboardingWizard";

const mockSteps: WizardStep[] = [
  { id: "signup", title: "Create Account", completed: true, current: false },
  { id: "data-sources", title: "Connect Data Sources", completed: false, current: true },
  { id: "teams", title: "Organize Teams", completed: false, current: false },
];

describe("OnboardingWizard", () => {
  it("renders all steps", () => {
    render(
      <OnboardingWizard steps={mockSteps}>
        <div>Test Content</div>
      </OnboardingWizard>,
    );

    expect(screen.getByText("Create Account")).toBeInTheDocument();
    expect(screen.getByText("Connect Data Sources")).toBeInTheDocument();
    expect(screen.getByText("Organize Teams")).toBeInTheDocument();
  });

  it("shows completed step with checkmark", () => {
    render(
      <OnboardingWizard steps={mockSteps}>
        <div>Test Content</div>
      </OnboardingWizard>,
    );

    expect(screen.getByText("✓")).toBeInTheDocument();
  });

  it("shows current step with special styling", () => {
    render(
      <OnboardingWizard steps={mockSteps}>
        <div>Test Content</div>
      </OnboardingWizard>,
    );

    const currentStep = screen.getByText("Connect Data Sources").closest("button");
    expect(currentStep).not.toBeDisabled();
  });

  it("calls onStepClick when step is clicked", () => {
    const mockOnStepClick = vi.fn();
    render(
      <OnboardingWizard steps={mockSteps} onStepClick={mockOnStepClick}>
        <div>Test Content</div>
      </OnboardingWizard>,
    );

    fireEvent.click(screen.getByText("Create Account"));
    expect(mockOnStepClick).toHaveBeenCalledWith("signup");
  });

  it("disables non-current and non-completed steps", () => {
    render(
      <OnboardingWizard steps={mockSteps}>
        <div>Test Content</div>
      </OnboardingWizard>,
    );

    const futureStep = screen.getByText("Organize Teams").closest("button");
    expect(futureStep).toBeDisabled();
  });

  it("renders children content", () => {
    render(
      <OnboardingWizard steps={mockSteps}>
        <div>Test Content</div>
      </OnboardingWizard>,
    );

    expect(screen.getByText("Test Content")).toBeInTheDocument();
  });
});
