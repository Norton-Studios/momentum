import "./streak-card.css";

export function StreakCard({ currentStreak, longestStreak }: StreakCardProps) {
  return (
    <div className="streak-cards">
      <div className="streak-card">
        <div className="streak-icon">🔥</div>
        <div className="streak-content">
          <span className="streak-value">{currentStreak}</span>
          <span className="streak-label">day{currentStreak !== 1 ? "s" : ""}</span>
        </div>
        <span className="streak-title">Current Streak</span>
      </div>
      <div className="streak-card">
        <div className="streak-icon">🏆</div>
        <div className="streak-content">
          <span className="streak-value">{longestStreak}</span>
          <span className="streak-label">day{longestStreak !== 1 ? "s" : ""}</span>
        </div>
        <span className="streak-title">Longest Streak</span>
      </div>
    </div>
  );
}

interface StreakCardProps {
  currentStreak: number;
  longestStreak: number;
}
