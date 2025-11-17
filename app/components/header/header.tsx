import { Link } from "react-router";
import { Button } from "../button/button";
import { Logo } from "../logo/logo";
import "./header.css";

export function Header() {
  return (
    <header className="header">
      <Logo />
      <nav>
        <Link to="#features">Features</Link>
        <Link to="#metrics">Metrics</Link>
        <Link to="#pricing">Pricing</Link>
        <Link to="#docs">Docs</Link>
        <Link to="/register">
          <Button>Get Started</Button>
        </Link>
      </nav>
    </header>
  );
}
