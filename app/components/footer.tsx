import { Link } from "react-router";

export function Footer() {
  return (
    <>
      <footer className="footer">
        <div>
          <div className="footer-brand">
            Momentum<span>.</span>
          </div>
          <p className="footer-desc">The premier platform for measuring and improving developer productivity across your organization.</p>
        </div>
        <div className="footer-column">
          <h4>Product</h4>
          <ul>
            <li>
              <Link to="#features">Features</Link>
            </li>
            <li>
              <Link to="#metrics">Metrics</Link>
            </li>
            <li>
              <Link to="#pricing">Pricing</Link>
            </li>
            <li>
              <Link to="#integrations">Integrations</Link>
            </li>
          </ul>
        </div>
        <div className="footer-column">
          <h4>Resources</h4>
          <ul>
            <li>
              <Link to="#docs">Documentation</Link>
            </li>
            <li>
              <Link to="#guides">Getting Started</Link>
            </li>
            <li>
              <Link to="#api">API Reference</Link>
            </li>
            <li>
              <Link to="#support">Support</Link>
            </li>
          </ul>
        </div>
        <div className="footer-column">
          <h4>Company</h4>
          <ul>
            <li>
              <Link to="#about">About Us</Link>
            </li>
            <li>
              <Link to="#blog">Blog</Link>
            </li>
            <li>
              <Link to="#careers">Careers</Link>
            </li>
            <li>
              <Link to="#contact">Contact</Link>
            </li>
          </ul>
        </div>
      </footer>
      <div className="footer-bottom">
        <p>&copy; 2025 Momentum. All rights reserved.</p>
      </div>
    </>
  );
}
