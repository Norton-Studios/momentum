import { Link } from "react-router";

interface LogoProps {
  className?: string;
  linkTo?: string;
}

export function Logo({ className = "", linkTo = "/" }: LogoProps) {
  const logoContent = (
    <div className={`logo ${className}`}>
      Momentum<span>.</span>
    </div>
  );

  if (linkTo) {
    return <Link to={linkTo}>{logoContent}</Link>;
  }

  return logoContent;
}
