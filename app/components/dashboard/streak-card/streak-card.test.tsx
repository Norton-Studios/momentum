import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StreakCard } from "./streak-card";

describe("StreakCard", () => {
  it("renders current streak value", () => {
    render(<StreakCard currentStreak={12} longestStreak={45} />);

    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Current Streak")).toBeInTheDocument();
  });

  it("renders longest streak value", () => {
    render(<StreakCard currentStreak={12} longestStreak={45} />);

    expect(screen.getByText("45")).toBeInTheDocument();
    expect(screen.getByText("Longest Streak")).toBeInTheDocument();
  });

  it("renders fire emoji for current streak", () => {
    render(<StreakCard currentStreak={12} longestStreak={45} />);

    expect(screen.getByText("🔥")).toBeInTheDocument();
  });

  it("renders trophy emoji for longest streak", () => {
    render(<StreakCard currentStreak={12} longestStreak={45} />);

    expect(screen.getByText("🏆")).toBeInTheDocument();
  });

  it("shows singular 'day' when streak is 1", () => {
    render(<StreakCard currentStreak={1} longestStreak={1} />);

    const dayLabels = screen.getAllByText("day");
    expect(dayLabels).toHaveLength(2);
  });

  it("shows plural 'days' when streak is more than 1", () => {
    render(<StreakCard currentStreak={5} longestStreak={10} />);

    const daysLabels = screen.getAllByText("days");
    expect(daysLabels).toHaveLength(2);
  });

  it("shows plural 'days' when streak is 0", () => {
    render(<StreakCard currentStreak={0} longestStreak={0} />);

    const daysLabels = screen.getAllByText("days");
    expect(daysLabels).toHaveLength(2);
  });

  it("renders two streak cards", () => {
    const { container } = render(<StreakCard currentStreak={12} longestStreak={45} />);

    expect(container.querySelectorAll(".streak-card")).toHaveLength(2);
  });

  it("renders streak cards container", () => {
    const { container } = render(<StreakCard currentStreak={12} longestStreak={45} />);

    expect(container.querySelector(".streak-cards")).toBeInTheDocument();
  });
});
