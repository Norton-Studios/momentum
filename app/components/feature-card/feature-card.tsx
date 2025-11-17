import "./feature-card.css";

export function FeatureCard({ number, title, description }: FeatureCardProps) {
  return (
    <div className="feature-card">
      <span className="feature-number">{number}</span>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

interface FeatureCardProps {
  number: string;
  title: string;
  description: string;
}
