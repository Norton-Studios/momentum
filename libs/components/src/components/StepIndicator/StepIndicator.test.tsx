import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { StepIndicator } from "./StepIndicator";

describe("StepIndicator", () => {
  const mockSteps = [
    { id: "step1", label: "Account Setup", description: "Create your account" },
    { id: "step2", label: "Profile", description: "Complete your profile" },
    { id: "step3", label: "Preferences", description: "Set your preferences" },
    { id: "step4", label: "Complete", description: "All done!" },
  ];

  it("should render all steps", () => {
    render(<StepIndicator steps={mockSteps} currentStep={1} />);

    expect(screen.getByText("Account Setup")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("Preferences")).toBeInTheDocument();
    expect(screen.getByText("Complete")).toBeInTheDocument();
  });

  it("should render step descriptions", () => {
    render(<StepIndicator steps={mockSteps} currentStep={1} />);

    expect(screen.getByText("Create your account")).toBeInTheDocument();
    expect(screen.getByText("Complete your profile")).toBeInTheDocument();
    expect(screen.getByText("Set your preferences")).toBeInTheDocument();
    expect(screen.getByText("All done!")).toBeInTheDocument();
  });

  it("should render steps without descriptions", () => {
    const stepsWithoutDesc = [
      { id: "step1", label: "Step 1" },
      { id: "step2", label: "Step 2" },
    ];

    render(<StepIndicator steps={stepsWithoutDesc} currentStep={1} />);

    expect(screen.getByText("Step 1")).toBeInTheDocument();
    expect(screen.getByText("Step 2")).toBeInTheDocument();
  });

  it("should indicate current step", () => {
    const { container } = render(<StepIndicator steps={mockSteps} currentStep={2} />);

    // Check by counting checkmarks vs numbers to determine which steps are completed/active
    const checkmarks = container.querySelectorAll('[class*="checkmark"]');
    expect(checkmarks).toHaveLength(1); // Step 1 should be completed

    // Check that step 2 shows "2" (active but not completed)
    expect(screen.getByText("2")).toBeInTheDocument();
    // Check that steps 3 and 4 show their numbers (not completed)
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("should show checkmarks for completed steps", () => {
    const { container } = render(<StepIndicator steps={mockSteps} currentStep={3} />);

    const checkmarks = container.querySelectorAll('[class*="checkmark"]');
    expect(checkmarks).toHaveLength(2); // Steps 1 and 2 should be completed
  });

  it("should show step numbers for non-completed steps", () => {
    render(<StepIndicator steps={mockSteps} currentStep={2} />);

    // Step 2 (current) should show "2"
    expect(screen.getByText("2")).toBeInTheDocument();
    // Step 3 should show "3"
    expect(screen.getByText("3")).toBeInTheDocument();
    // Step 4 should show "4"
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("should calculate progress bar width correctly", () => {
    const { container, rerender } = render(<StepIndicator steps={mockSteps} currentStep={1} />);

    let progressFill = container.querySelector('[class*="progressFill"]') as HTMLElement;
    expect(progressFill).toHaveStyle("width: 0%"); // (1-1)/(4-1) * 100 = 0%

    rerender(<StepIndicator steps={mockSteps} currentStep={2} />);
    progressFill = container.querySelector('[class*="progressFill"]') as HTMLElement;
    expect(progressFill).toHaveAttribute("style", expect.stringMatching(/width:\s*33\.33/)); // (2-1)/(4-1) * 100 = 33.33%

    rerender(<StepIndicator steps={mockSteps} currentStep={3} />);
    progressFill = container.querySelector('[class*="progressFill"]') as HTMLElement;
    expect(progressFill).toHaveAttribute("style", expect.stringMatching(/width:\s*66\.666/)); // (3-1)/(4-1) * 100 = 66.67%

    rerender(<StepIndicator steps={mockSteps} currentStep={4} />);
    progressFill = container.querySelector('[class*="progressFill"]') as HTMLElement;
    expect(progressFill).toHaveStyle("width: 100%"); // (4-1)/(4-1) * 100 = 100%
  });

  it("should apply custom className", () => {
    const { container } = render(<StepIndicator steps={mockSteps} currentStep={1} className="custom-indicator" />);

    expect(container.firstChild).toHaveClass("custom-indicator");
  });

  it("should handle single step", () => {
    const singleStep = [{ id: "only", label: "Only Step" }];
    const { container } = render(<StepIndicator steps={singleStep} currentStep={1} />);

    // For single step, progress bar should exist but width calculation results in NaN
    const progressFill = container.querySelector('[class*="progressFill"]');
    expect(progressFill).toBeInTheDocument();

    expect(screen.getByText("Only Step")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("should handle two steps correctly", () => {
    const twoSteps = [
      { id: "first", label: "First" },
      { id: "second", label: "Second" },
    ];

    const { container, rerender } = render(<StepIndicator steps={twoSteps} currentStep={1} />);

    let progressFill = container.querySelector('[class*="progressFill"]') as HTMLElement;
    expect(progressFill).toHaveStyle("width: 0%"); // (1-1)/(2-1) * 100 = 0%

    rerender(<StepIndicator steps={twoSteps} currentStep={2} />);
    progressFill = container.querySelector('[class*="progressFill"]') as HTMLElement;
    expect(progressFill).toHaveStyle("width: 100%"); // (2-1)/(2-1) * 100 = 100%
  });

  it("should handle current step beyond total steps", () => {
    const { container } = render(<StepIndicator steps={mockSteps} currentStep={10} />);

    // Should show checkmarks for all steps since they're all completed
    const checkmarks = container.querySelectorAll('[class*="checkmark"]');
    expect(checkmarks).toHaveLength(4);

    // Progress should be beyond 100%
    const progressFill = container.querySelector('[class*="progressFill"]') as HTMLElement;
    expect(progressFill).toHaveStyle("width: 300%"); // (10-1)/(4-1) * 100 = 300%
  });

  it("should handle current step as 0 or negative", () => {
    const { container } = render(<StepIndicator steps={mockSteps} currentStep={0} />);

    // No checkmarks should be present since no steps are completed
    const checkmarks = container.querySelectorAll('[class*="checkmark"]');
    expect(checkmarks).toHaveLength(0);

    const progressFill = container.querySelector('[class*="progressFill"]') as HTMLElement;
    expect(progressFill).toHaveStyle("width: -33.333333333333336%"); // Negative progress

    // Should show all step numbers
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("should render progress bar and steps in correct structure", () => {
    const { container } = render(<StepIndicator steps={mockSteps} currentStep={2} />);

    const progressBar = container.querySelector('[class*="progressBar"]');
    const stepsContainer = container.querySelector('[class*="steps"]');
    const progressFill = container.querySelector('[class*="progressFill"]');

    expect(progressBar).toBeInTheDocument();
    expect(stepsContainer).toBeInTheDocument();
    expect(progressFill).toBeInTheDocument();
    expect(progressBar?.contains(progressFill!)).toBe(true);
  });

  it("should render step content structure correctly", () => {
    const { container } = render(<StepIndicator steps={mockSteps} currentStep={2} />);

    // Check that the structure elements exist in the container
    const stepNumbers = container.querySelectorAll('[class*="stepNumber"]');
    const stepContents = container.querySelectorAll('[class*="stepContent"]');
    const stepLabels = container.querySelectorAll('[class*="stepLabel"]');

    expect(stepNumbers.length).toBe(4); // Should have 4 step numbers
    expect(stepContents.length).toBe(4); // Should have 4 step content containers
    expect(stepLabels.length).toBe(4); // Should have 4 step labels
  });

  it("should handle empty steps array", () => {
    const { container } = render(<StepIndicator steps={[]} currentStep={1} />);

    const stepsContainer = container.querySelector('[class*="steps"]');
    expect(stepsContainer?.children).toHaveLength(0);

    const progressFill = container.querySelector('[class*="progressFill"]') as HTMLElement;
    // Division by zero should be handled gracefully - should result in width: NaN% which gets normalized
    expect(progressFill).toHaveAttribute("style", expect.stringContaining("width:"));
  });
});
