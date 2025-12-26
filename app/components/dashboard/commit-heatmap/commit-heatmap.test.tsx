import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CommitHeatmap } from "./commit-heatmap";

describe("CommitHeatmap", () => {
  it("renders empty state when no data", () => {
    render(<CommitHeatmap data={[]} totalCommits={0} />);

    expect(screen.getByText("No commit data available for this period")).toBeInTheDocument();
  });

  it("renders commit activity label", () => {
    const data = [{ date: "2025-01-01", count: 5, dayOfWeek: 3, weekNumber: 0 }];

    render(<CommitHeatmap data={data} totalCommits={5} />);

    expect(screen.getByText("Commit Activity")).toBeInTheDocument();
  });

  it("renders formatted total commits count", () => {
    const data = [{ date: "2025-01-01", count: 5, dayOfWeek: 3, weekNumber: 0 }];

    render(<CommitHeatmap data={data} totalCommits={1234} />);

    expect(screen.getByText("1,234")).toBeInTheDocument();
  });

  it("renders day labels", () => {
    const data = [{ date: "2025-01-01", count: 5, dayOfWeek: 3, weekNumber: 0 }];

    render(<CommitHeatmap data={data} totalCommits={5} />);

    expect(screen.getByText("Sun")).toBeInTheDocument();
    expect(screen.getByText("Mon")).toBeInTheDocument();
    expect(screen.getByText("Tue")).toBeInTheDocument();
    expect(screen.getByText("Wed")).toBeInTheDocument();
    expect(screen.getByText("Thu")).toBeInTheDocument();
    expect(screen.getByText("Fri")).toBeInTheDocument();
    expect(screen.getByText("Sat")).toBeInTheDocument();
  });

  it("renders heatmap cells for each data point", () => {
    const data = [
      { date: "2025-01-01", count: 5, dayOfWeek: 3, weekNumber: 0 },
      { date: "2025-01-02", count: 3, dayOfWeek: 4, weekNumber: 0 },
      { date: "2025-01-03", count: 0, dayOfWeek: 5, weekNumber: 0 },
    ];

    const { container } = render(<CommitHeatmap data={data} totalCommits={8} />);

    expect(container.querySelectorAll(".heatmap-cell")).toHaveLength(3);
  });

  it("sets correct data-level for cells based on count", () => {
    // Level calculation: 0=0%, 1=1-25%, 2=26-50%, 3=51-75%, 4=76-100%
    // Max is 10, so: 0->0, 2->1 (20%), 5->2 (50%), 8->4 (80%), 10->4 (100%)
    const data = [
      { date: "2025-01-01", count: 0, dayOfWeek: 0, weekNumber: 0 },
      { date: "2025-01-02", count: 2, dayOfWeek: 1, weekNumber: 0 },
      { date: "2025-01-03", count: 5, dayOfWeek: 2, weekNumber: 0 },
      { date: "2025-01-04", count: 8, dayOfWeek: 3, weekNumber: 0 },
      { date: "2025-01-05", count: 10, dayOfWeek: 4, weekNumber: 0 },
    ];

    const { container } = render(<CommitHeatmap data={data} totalCommits={25} />);

    const cells = container.querySelectorAll(".heatmap-cell");
    expect(cells[0]).toHaveAttribute("data-level", "0");
    expect(cells[1]).toHaveAttribute("data-level", "1");
    expect(cells[2]).toHaveAttribute("data-level", "2");
    expect(cells[3]).toHaveAttribute("data-level", "4");
    expect(cells[4]).toHaveAttribute("data-level", "4");
  });

  it("sets tooltip with date and commit count", () => {
    const data = [{ date: "2025-01-01", count: 5, dayOfWeek: 3, weekNumber: 0 }];

    const { container } = render(<CommitHeatmap data={data} totalCommits={5} />);

    const cell = container.querySelector(".heatmap-cell");
    expect(cell).toHaveAttribute("title", "2025-01-01: 5 commits");
  });

  it("uses singular 'commit' when count is 1", () => {
    const data = [{ date: "2025-01-01", count: 1, dayOfWeek: 3, weekNumber: 0 }];

    const { container } = render(<CommitHeatmap data={data} totalCommits={1} />);

    const cell = container.querySelector(".heatmap-cell");
    expect(cell).toHaveAttribute("title", "2025-01-01: 1 commit");
  });

  it("renders heatmap grid with correct CSS variable", () => {
    const data = [
      { date: "2025-01-01", count: 5, dayOfWeek: 3, weekNumber: 0 },
      { date: "2025-01-08", count: 3, dayOfWeek: 3, weekNumber: 1 },
      { date: "2025-01-15", count: 2, dayOfWeek: 3, weekNumber: 2 },
    ];

    const { container } = render(<CommitHeatmap data={data} totalCommits={10} />);

    const grid = container.querySelector(".heatmap-grid");
    expect(grid).toHaveStyle({ "--week-count": "3" });
  });
});
