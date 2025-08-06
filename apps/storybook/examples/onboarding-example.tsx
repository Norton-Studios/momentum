import type React from "react";
import { useState } from "react";
import { Button, StepIndicator, FormInput, Card, type Step } from "@mmtm/components";

const onboardingSteps: Step[] = [
  { id: "signup", label: "Sign Up", description: "Create your account" },
  { id: "data-sources", label: "Data Sources", description: "Connect your tools" },
  { id: "team-setup", label: "Team Setup", description: "Organize repositories" },
  { id: "review", label: "Review", description: "Complete setup" },
];

const dataSourceOptions = [
  {
    id: "github",
    title: "GitHub",
    description: "Connect your GitHub repositories",
    icon: "🐙",
  },
  {
    id: "gitlab",
    title: "GitLab",
    description: "Connect your GitLab projects",
    icon: "🦊",
  },
  {
    id: "bitbucket",
    title: "Bitbucket",
    description: "Connect your Bitbucket repositories",
    icon: "🪣",
  },
];

export const OnboardingExample: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedDataSources, setSelectedDataSources] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    organization: "",
    password: "",
  });

  const handleDataSourceToggle = (id: string) => {
    const newSelection = new Set(selectedDataSources);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedDataSources(newSelection);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div>
            <h2 style={{ marginBottom: "2rem" }}>Create your account</h2>
            <FormInput label="Full Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            <FormInput
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              icon="✉️"
            />
            <FormInput
              label="Organization Name"
              value={formData.organization}
              onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
              helperText="This will be your organization's unique identifier"
              required
            />
            <FormInput
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              helperText="Use 8+ characters, mix of letters, numbers & symbols"
              required
            />
          </div>
        );

      case 2:
        return (
          <div>
            <h2 style={{ marginBottom: "2rem" }}>Connect your data sources</h2>
            <p style={{ marginBottom: "2rem", color: "#718096" }}>Select the version control systems you want to connect</p>
            <div style={{ display: "grid", gap: "1rem" }}>
              {dataSourceOptions.map((source) => (
                <Card
                  key={source.id}
                  icon={source.icon}
                  title={source.title}
                  description={source.description}
                  variant="outlined"
                  selected={selectedDataSources.has(source.id)}
                  onClick={() => handleDataSourceToggle(source.id)}
                />
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div>
            <h2 style={{ marginBottom: "2rem" }}>Set up your teams</h2>
            <p style={{ marginBottom: "2rem", color: "#718096" }}>We'll help you organize your repositories into teams</p>
            <Card icon="🔍" title="Repository Discovery" description="We found 23 repositories across your connected data sources" variant="gradient" />
          </div>
        );

      case 4:
        return (
          <div>
            <h2 style={{ marginBottom: "2rem" }}>Review and complete</h2>
            <Card title="Account Information" variant="outlined">
              <p>
                <strong>Name:</strong> {formData.name || "Not provided"}
              </p>
              <p>
                <strong>Email:</strong> {formData.email || "Not provided"}
              </p>
              <p>
                <strong>Organization:</strong> {formData.organization || "Not provided"}
              </p>
            </Card>
            <div style={{ marginTop: "1rem" }}>
              <Card title="Connected Data Sources" variant="outlined">
                <p>{selectedDataSources.size} data source(s) selected</p>
              </Card>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem" }}>
      <StepIndicator steps={onboardingSteps} currentStep={currentStep} />

      <div style={{ background: "white", padding: "2rem", borderRadius: "12px", boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)" }}>
        {renderStepContent()}

        <div style={{ marginTop: "2rem", display: "flex", justifyContent: "space-between" }}>
          <Button variant="ghost" onClick={() => setCurrentStep(Math.max(1, currentStep - 1))} disabled={currentStep === 1}>
            Previous
          </Button>

          {currentStep < 4 ? (
            <Button variant="primary" gradient onClick={() => setCurrentStep(Math.min(4, currentStep + 1))}>
              Continue
            </Button>
          ) : (
            <Button variant="primary" gradient onClick={() => console.log("Onboarding complete!")}>
              Complete Setup
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
