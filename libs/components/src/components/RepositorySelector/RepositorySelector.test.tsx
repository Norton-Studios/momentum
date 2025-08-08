import { render, screen, fireEvent } from "@testing-library/react";
import { vi } from "vitest";
import { RepositorySelector } from "./RepositorySelector";
import type { DiscoveredRepository, RepositoryDiscoveryResult } from "@mmtm/resource-repository";

const mockRepository: DiscoveredRepository = {
  externalId: "repo-1",
  name: "test-repo",
  owner: "test-owner",
  description: "Test repository description",
  language: "TypeScript",
  stars: 100,
  forks: 25,
  isPrivate: false,
};

const mockDiscoveryResult: RepositoryDiscoveryResult = {
  dataSource: "github",
  repositories: [mockRepository],
  totalCount: 1,
};

describe("RepositorySelector", () => {
  const mockOnRepositoriesChange = vi.fn();

  beforeEach(() => {
    mockOnRepositoriesChange.mockClear();
  });

  describe("component rendering", () => {
    it("renders loading state", () => {
      render(<RepositorySelector onRepositoriesChange={mockOnRepositoriesChange} isLoading={true} />);

      expect(screen.getByText("Discovering repositories from your connected data sources...")).toBeInTheDocument();
      expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    });

    it("renders error state", () => {
      const errorMessage = "Failed to connect to GitHub";
      render(<RepositorySelector onRepositoriesChange={mockOnRepositoriesChange} error={errorMessage} />);

      expect(screen.getByText("Error discovering repositories")).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByText("Please check your data source configuration and try again.")).toBeInTheDocument();
    });

    it("renders empty state when no discovery results", () => {
      render(<RepositorySelector onRepositoriesChange={mockOnRepositoriesChange} discoveryResults={[]} />);

      expect(screen.getByText("No repositories found")).toBeInTheDocument();
      expect(screen.getByText("Make sure you have connected at least one data source in the previous step.")).toBeInTheDocument();
    });

    it("renders repository selection interface", () => {
      render(<RepositorySelector onRepositoriesChange={mockOnRepositoriesChange} discoveryResults={[mockDiscoveryResult]} />);

      expect(screen.getByText("Select Repositories to Track")).toBeInTheDocument();
      expect(screen.getByText("Choose which repositories you want to include in your productivity tracking.")).toBeInTheDocument();
      expect(screen.getByText("Github")).toBeInTheDocument();
      expect(screen.getByText("test-repo")).toBeInTheDocument();
      expect(screen.getByText("by test-owner")).toBeInTheDocument();
    });
  });

  describe("repository selection", () => {
    it("calls onRepositoriesChange with initial repositories", () => {
      render(
        <RepositorySelector onRepositoriesChange={mockOnRepositoriesChange} discoveryResults={[mockDiscoveryResult]} initialRepositories={[mockRepository]} />,
      );

      expect(mockOnRepositoriesChange).toHaveBeenCalledWith([mockRepository]);
    });

    it("toggles repository selection when clicked", () => {
      render(<RepositorySelector onRepositoriesChange={mockOnRepositoriesChange} discoveryResults={[mockDiscoveryResult]} />);

      const repositoryButton = screen.getByRole("button", { name: /test-repo/ });
      fireEvent.click(repositoryButton);

      expect(mockOnRepositoriesChange).toHaveBeenCalledWith([mockRepository]);
      expect(repositoryButton).toHaveClass("selected");
    });

    it("deselects repository when clicked again", () => {
      render(
        <RepositorySelector onRepositoriesChange={mockOnRepositoriesChange} discoveryResults={[mockDiscoveryResult]} initialRepositories={[mockRepository]} />,
      );

      const repositoryButton = screen.getByRole("button", { name: /test-repo/ });
      fireEvent.click(repositoryButton);

      expect(mockOnRepositoriesChange).toHaveBeenLastCalledWith([]);
      expect(repositoryButton).not.toHaveClass("selected");
    });

    it("toggles repository selection via checkbox", () => {
      render(<RepositorySelector onRepositoriesChange={mockOnRepositoriesChange} discoveryResults={[mockDiscoveryResult]} />);

      const checkbox = screen.getByRole("checkbox");
      fireEvent.click(checkbox);

      expect(mockOnRepositoriesChange).toHaveBeenCalledWith([mockRepository]);
    });
  });

  describe("select all functionality", () => {
    const multipleReposResult: RepositoryDiscoveryResult = {
      dataSource: "github",
      repositories: [mockRepository, { ...mockRepository, externalId: "repo-2", name: "test-repo-2" }],
      totalCount: 2,
    };

    it("selects all repositories when select all is clicked", () => {
      render(<RepositorySelector onRepositoriesChange={mockOnRepositoriesChange} discoveryResults={[multipleReposResult]} />);

      const selectAllButton = screen.getByRole("button", { name: /select all \(2\)/i });
      fireEvent.click(selectAllButton);

      expect(mockOnRepositoriesChange).toHaveBeenCalledWith(multipleReposResult.repositories);
    });

    it("deselects all repositories when deselect all is clicked", () => {
      render(
        <RepositorySelector
          onRepositoriesChange={mockOnRepositoriesChange}
          discoveryResults={[multipleReposResult]}
          initialRepositories={multipleReposResult.repositories}
        />,
      );

      const deselectAllButton = screen.getByRole("button", { name: /deselect all/i });
      fireEvent.click(deselectAllButton);

      expect(mockOnRepositoriesChange).toHaveBeenLastCalledWith([]);
    });
  });

  describe("repository information display", () => {
    it("displays repository metadata", () => {
      render(<RepositorySelector onRepositoriesChange={mockOnRepositoriesChange} discoveryResults={[mockDiscoveryResult]} />);

      expect(screen.getByText("Test repository description")).toBeInTheDocument();
      expect(screen.getByText("TypeScript")).toBeInTheDocument();
      expect(screen.getByText("⭐ 100 • 🍴 25")).toBeInTheDocument();
    });

    it("displays private badge for private repositories", () => {
      const privateRepo: DiscoveredRepository = {
        ...mockRepository,
        isPrivate: true,
      };

      const privateDiscoveryResult: RepositoryDiscoveryResult = {
        dataSource: "github",
        repositories: [privateRepo],
        totalCount: 1,
      };

      render(<RepositorySelector onRepositoriesChange={mockOnRepositoriesChange} discoveryResults={[privateDiscoveryResult]} />);

      expect(screen.getByText("Private")).toBeInTheDocument();
    });

    it("handles repositories without description", () => {
      const repoWithoutDescription: DiscoveredRepository = {
        ...mockRepository,
        description: undefined,
      };

      const discoveryResult: RepositoryDiscoveryResult = {
        dataSource: "github",
        repositories: [repoWithoutDescription],
        totalCount: 1,
      };

      render(<RepositorySelector onRepositoriesChange={mockOnRepositoriesChange} discoveryResults={[discoveryResult]} />);

      expect(screen.getByText("test-repo")).toBeInTheDocument();
      expect(screen.queryByText("Test repository description")).not.toBeInTheDocument();
    });
  });

  describe("selection summary", () => {
    it("displays correct selection count", () => {
      render(
        <RepositorySelector onRepositoriesChange={mockOnRepositoriesChange} discoveryResults={[mockDiscoveryResult]} initialRepositories={[mockRepository]} />,
      );

      expect(screen.getByText("1 repositories selected")).toBeInTheDocument();
    });

    it("updates selection count when repositories are toggled", () => {
      render(<RepositorySelector onRepositoriesChange={mockOnRepositoriesChange} discoveryResults={[mockDiscoveryResult]} />);

      expect(screen.getByText("0 repositories selected")).toBeInTheDocument();

      const repositoryButton = screen.getByRole("button", { name: /test-repo/ });
      fireEvent.click(repositoryButton);

      expect(screen.getByText("1 repositories selected")).toBeInTheDocument();
    });
  });
});
