import type { Meta, StoryObj } from "@storybook/react";
import { DataSourceCard } from "@mmtm/components";

const meta: Meta<typeof DataSourceCard> = {
  title: "Onboarding/DataSourceCard",
  component: DataSourceCard,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ width: "350px" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const GitHub: Story = {
  args: {
    provider: "github",
    title: "GitHub",
    description: "Connect to GitHub.com or GitHub Enterprise to track commits, pull requests, and code reviews.",
    features: ["Commit activity tracking", "Pull request metrics", "Code review insights", "Repository statistics"],
  },
};

export const GitLab: Story = {
  args: {
    provider: "gitlab",
    title: "GitLab",
    description: "Connect to GitLab.com or self-hosted GitLab instances for comprehensive DevOps metrics.",
    features: ["Merge request tracking", "CI/CD pipeline metrics", "Issue management data", "Deployment frequency"],
  },
};

export const Bitbucket: Story = {
  args: {
    provider: "bitbucket",
    title: "Bitbucket",
    description: "Integrate with Bitbucket Cloud or Server to analyze code contributions and collaboration patterns.",
    features: ["Repository insights", "Branch management", "Pull request analytics", "Team collaboration metrics"],
  },
};

export const Selected: Story = {
  args: {
    provider: "github",
    title: "GitHub",
    description: "Connect to GitHub.com or GitHub Enterprise to track commits, pull requests, and code reviews.",
    features: ["Commit activity tracking", "Pull request metrics"],
    selected: true,
  },
};

export const Disabled: Story = {
  args: {
    provider: "gitlab",
    title: "GitLab",
    description: "This data source is not available for your plan.",
    disabled: true,
  },
};

export const Interactive: Story = {
  args: {
    provider: "github",
    title: "GitHub",
    description: "Click to select this data source.",
    features: ["Click me to select"],
    onClick: () => console.log("GitHub selected!"),
  },
};

export const CustomIcon: Story = {
  args: {
    title: "Custom Data Source",
    description: "A custom data source with a custom icon.",
    features: ["Custom feature 1", "Custom feature 2"],
    icon: "🚀",
  },
};

export const Grid: Story = {
  render: () => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", width: "900px" }}>
      <DataSourceCard
        provider="github"
        title="GitHub"
        description="Track commits, PRs, and code reviews."
        features={["Commits", "Pull Requests"]}
        onClick={() => {}}
      />
      <DataSourceCard
        provider="gitlab"
        title="GitLab"
        description="Comprehensive DevOps metrics and CI/CD."
        features={["Pipelines", "Deployments"]}
        selected
        onClick={() => {}}
      />
      <DataSourceCard
        provider="bitbucket"
        title="Bitbucket"
        description="Code contributions and collaboration."
        features={["Branches", "Analytics"]}
        onClick={() => {}}
      />
    </div>
  ),
};
