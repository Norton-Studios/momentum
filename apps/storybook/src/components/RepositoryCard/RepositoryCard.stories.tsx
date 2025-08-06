import type { Meta, StoryObj } from "@storybook/react";
import { RepositoryCard } from "@mmtm/components";

const meta: Meta<typeof RepositoryCard> = {
  title: "Onboarding/RepositoryCard",
  component: RepositoryCard,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ width: "500px" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: "momentum-frontend",
    description: "Main frontend application for the Momentum platform",
    language: "TypeScript",
    languageColor: "#3178c6",
    visibility: "private",
    stars: 42,
    lastUpdated: "2 days ago",
  },
};

export const Public: Story = {
  args: {
    name: "open-source-library",
    description: "A helpful open source library for developers",
    language: "JavaScript",
    languageColor: "#f7df1e",
    visibility: "public",
    stars: 128,
    lastUpdated: "1 week ago",
  },
};

export const WithSelection: Story = {
  args: {
    name: "api-service",
    description: "Backend API service",
    language: "Python",
    languageColor: "#3776ab",
    visibility: "private",
    lastUpdated: "3 hours ago",
    onSelectionChange: (selected) => console.log("Selected:", selected),
  },
};

export const Selected: Story = {
  args: {
    name: "data-pipeline",
    description: "ETL pipeline for data processing",
    language: "Go",
    languageColor: "#00ADD8",
    visibility: "private",
    stars: 15,
    lastUpdated: "1 day ago",
    selected: true,
    onSelectionChange: (selected) => console.log("Selected:", selected),
  },
};

export const Minimal: Story = {
  args: {
    name: "simple-repo",
    visibility: "public",
  },
};

export const LongDescription: Story = {
  args: {
    name: "complex-project",
    description:
      "This is a very long description that will be truncated after two lines to maintain a consistent card height across all repository cards in the list view",
    language: "Rust",
    languageColor: "#CE4024",
    visibility: "private",
    stars: 200,
    lastUpdated: "1 month ago",
  },
};

export const LanguageVariety: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "500px" }}>
      <RepositoryCard name="react-components" language="TypeScript" languageColor="#3178c6" visibility="public" stars={450} onSelectionChange={() => {}} />
      <RepositoryCard name="ml-models" language="Python" languageColor="#3776ab" visibility="private" stars={89} selected onSelectionChange={() => {}} />
      <RepositoryCard name="microservice-api" language="Go" languageColor="#00ADD8" visibility="private" stars={156} onSelectionChange={() => {}} />
      <RepositoryCard name="android-app" language="Kotlin" languageColor="#7F52FF" visibility="public" stars={234} onSelectionChange={() => {}} />
    </div>
  ),
};
