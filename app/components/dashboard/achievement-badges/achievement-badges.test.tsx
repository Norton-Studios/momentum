import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AchievementBadges } from "./achievement-badges";

describe("AchievementBadges", () => {
  it("renders empty state when no achievements", () => {
    render(<AchievementBadges achievements={[]} />);

    expect(screen.getByText("No achievements yet. Keep contributing!")).toBeInTheDocument();
  });

  it("renders achievements title when achievements exist", () => {
    const achievements = [{ id: "1", name: "First Commit", icon: "commit", earned: true }];

    render(<AchievementBadges achievements={achievements} />);

    expect(screen.getByText("Achievements")).toBeInTheDocument();
  });

  it("renders all achievements", () => {
    const achievements = [
      { id: "1", name: "First Commit", icon: "commit", earned: true },
      { id: "2", name: "Century", icon: "century", earned: true },
      { id: "3", name: "Week Warrior", icon: "fire", earned: true },
    ];

    render(<AchievementBadges achievements={achievements} />);

    expect(screen.getByText("First Commit")).toBeInTheDocument();
    expect(screen.getByText("Century")).toBeInTheDocument();
    expect(screen.getByText("Week Warrior")).toBeInTheDocument();
  });

  it("renders correct icons for known badge types", () => {
    const achievements = [
      { id: "1", name: "Target", icon: "commit", earned: true },
      { id: "2", name: "Hundred", icon: "century", earned: true },
      { id: "3", name: "Fire", icon: "fire", earned: true },
      { id: "4", name: "Trophy", icon: "trophy", earned: true },
    ];

    render(<AchievementBadges achievements={achievements} />);

    expect(screen.getByText("🎯")).toBeInTheDocument();
    expect(screen.getByText("💯")).toBeInTheDocument();
    expect(screen.getByText("🔥")).toBeInTheDocument();
    expect(screen.getByText("🏆")).toBeInTheDocument();
  });

  it("renders default icon for unknown badge types", () => {
    const achievements = [{ id: "1", name: "Unknown", icon: "unknown-icon", earned: true }];

    render(<AchievementBadges achievements={achievements} />);

    expect(screen.getByText("🏅")).toBeInTheDocument();
  });

  it("uses description as title attribute when provided", () => {
    const achievements = [{ id: "1", name: "First Commit", icon: "commit", earned: true, description: "Made your first commit" }];

    const { container } = render(<AchievementBadges achievements={achievements} />);

    const badge = container.querySelector(".badge");
    expect(badge).toHaveAttribute("title", "Made your first commit");
  });

  it("uses name as title attribute when description not provided", () => {
    const achievements = [{ id: "1", name: "First Commit", icon: "commit", earned: true }];

    const { container } = render(<AchievementBadges achievements={achievements} />);

    const badge = container.querySelector(".badge");
    expect(badge).toHaveAttribute("title", "First Commit");
  });

  it("renders badges in a grid layout", () => {
    const achievements = [
      { id: "1", name: "First Commit", icon: "commit", earned: true },
      { id: "2", name: "Century", icon: "century", earned: true },
    ];

    const { container } = render(<AchievementBadges achievements={achievements} />);

    expect(container.querySelector(".badges-grid")).toBeInTheDocument();
    expect(container.querySelectorAll(".badge")).toHaveLength(2);
  });
});
