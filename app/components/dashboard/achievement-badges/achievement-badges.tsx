import "./achievement-badges.css";

const BADGE_ICONS: Record<string, string> = {
  commit: "🎯",
  century: "💯",
  star: "⭐",
  trophy: "🏆",
  merge: "🔀",
  review: "👀",
  shield: "🛡️",
  fire: "🔥",
  calendar: "📅",
};

export function AchievementBadges({ achievements }: AchievementBadgesProps) {
  if (achievements.length === 0) {
    return (
      <div className="achievement-badges-empty">
        <p>No achievements yet. Keep contributing!</p>
      </div>
    );
  }

  return (
    <div className="achievement-badges">
      <h3 className="badges-title">Achievements</h3>
      <div className="badges-grid">
        {achievements.map((achievement) => (
          <div key={achievement.id} className="badge" title={achievement.description || achievement.name}>
            <span className="badge-icon">{BADGE_ICONS[achievement.icon] || "🏅"}</span>
            <span className="badge-name">{achievement.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface Achievement {
  id: string;
  name: string;
  icon: string;
  earned: boolean;
  description?: string;
}

interface AchievementBadgesProps {
  achievements: Achievement[];
}
