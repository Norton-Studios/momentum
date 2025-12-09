import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { type Repository, RepositoryList } from "./repository-list";

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getTotalSize: () => count * 60,
    getVirtualItems: () =>
      Array.from({ length: count }, (_, i) => ({
        index: i,
        start: i * 60,
        size: 60,
        key: i,
      })),
    measureElement: vi.fn(),
  }),
}));

const createRepository = (overrides: Partial<Repository> = {}): Repository => ({
  id: "repo-1",
  name: "test-repo",
  fullName: "org/test-repo",
  description: "A test repository",
  language: "TypeScript",
  stars: 42,
  isPrivate: false,
  isEnabled: false,
  lastSyncAt: new Date("2025-12-01"),
  ...overrides,
});

describe("RepositoryList", () => {
  it("renders empty state when no repositories", () => {
    render(<RepositoryList repositories={[]} selectedIds={new Set()} onToggle={vi.fn()} />);

    expect(screen.getByText("No repositories found")).toBeInTheDocument();
  });

  it("renders repository items", () => {
    const repositories = [createRepository({ id: "1", name: "repo-1" }), createRepository({ id: "2", name: "repo-2" })];

    render(<RepositoryList repositories={repositories} selectedIds={new Set()} onToggle={vi.fn()} />);

    expect(screen.getByText("repo-1")).toBeInTheDocument();
    expect(screen.getByText("repo-2")).toBeInTheDocument();
  });

  it("displays repository name", () => {
    const repositories = [createRepository({ name: "my-awesome-repo" })];

    render(<RepositoryList repositories={repositories} selectedIds={new Set()} onToggle={vi.fn()} />);

    expect(screen.getByText("my-awesome-repo")).toBeInTheDocument();
  });

  it("displays language badge when language is set", () => {
    const repositories = [createRepository({ language: "Python" })];

    render(<RepositoryList repositories={repositories} selectedIds={new Set()} onToggle={vi.fn()} />);

    expect(screen.getByText("Python")).toBeInTheDocument();
  });

  it("does not display language badge when language is null", () => {
    const repositories = [createRepository({ language: null })];

    render(<RepositoryList repositories={repositories} selectedIds={new Set()} onToggle={vi.fn()} />);

    expect(screen.queryByText("TypeScript")).not.toBeInTheDocument();
  });

  it("displays private badge for private repositories", () => {
    const repositories = [createRepository({ isPrivate: true })];

    render(<RepositoryList repositories={repositories} selectedIds={new Set()} onToggle={vi.fn()} />);

    expect(screen.getByText("Private")).toBeInTheDocument();
  });

  it("does not display private badge for public repositories", () => {
    const repositories = [createRepository({ isPrivate: false })];

    render(<RepositoryList repositories={repositories} selectedIds={new Set()} onToggle={vi.fn()} />);

    expect(screen.queryByText("Private")).not.toBeInTheDocument();
  });

  it("displays star count when stars > 0", () => {
    const repositories = [createRepository({ stars: 100 })];

    render(<RepositoryList repositories={repositories} selectedIds={new Set()} onToggle={vi.fn()} />);

    expect(screen.getByText("★ 100")).toBeInTheDocument();
  });

  it("does not display star count when stars is 0", () => {
    const repositories = [createRepository({ stars: 0 })];

    render(<RepositoryList repositories={repositories} selectedIds={new Set()} onToggle={vi.fn()} />);

    expect(screen.queryByText(/★/)).not.toBeInTheDocument();
  });

  it("displays last active time when lastSyncAt is set", () => {
    const repositories = [createRepository({ lastSyncAt: new Date("2025-12-01") })];

    render(<RepositoryList repositories={repositories} selectedIds={new Set()} onToggle={vi.fn()} />);

    expect(screen.getByText(/Updated \d+d ago/)).toBeInTheDocument();
  });

  it("does not display last active time when lastSyncAt is null", () => {
    const repositories = [createRepository({ lastSyncAt: null })];

    render(<RepositoryList repositories={repositories} selectedIds={new Set()} onToggle={vi.fn()} />);

    expect(screen.queryByText(/Updated/)).not.toBeInTheDocument();
  });

  it("renders checkbox as checked when repository is selected", () => {
    const repositories = [createRepository({ id: "repo-1" })];

    render(<RepositoryList repositories={repositories} selectedIds={new Set(["repo-1"])} onToggle={vi.fn()} />);

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeChecked();
  });

  it("renders checkbox as unchecked when repository is not selected", () => {
    const repositories = [createRepository({ id: "repo-1" })];

    render(<RepositoryList repositories={repositories} selectedIds={new Set()} onToggle={vi.fn()} />);

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();
  });

  it("calls onToggle with repository id and true when checkbox is checked", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const repositories = [createRepository({ id: "repo-1" })];

    render(<RepositoryList repositories={repositories} selectedIds={new Set()} onToggle={onToggle} />);

    const checkbox = screen.getByRole("checkbox");
    await user.click(checkbox);

    expect(onToggle).toHaveBeenCalledWith("repo-1", true);
  });

  it("calls onToggle with repository id and false when checkbox is unchecked", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const repositories = [createRepository({ id: "repo-1" })];

    render(<RepositoryList repositories={repositories} selectedIds={new Set(["repo-1"])} onToggle={onToggle} />);

    const checkbox = screen.getByRole("checkbox");
    await user.click(checkbox);

    expect(onToggle).toHaveBeenCalledWith("repo-1", false);
  });
});
