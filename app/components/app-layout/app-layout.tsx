import { useEffect, useRef, useState } from "react";
import { Form, Link } from "react-router";
import { Logo } from "~/components/logo/logo";
import "./app-layout.css";

export function AppLayout({ children, activeNav, user }: AppLayoutProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const initials =
    user.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() ||
    user.email?.[0]?.toUpperCase() ||
    "?";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isDropdownOpen]);

  return (
    <>
      <header className="app-header">
        <div className="header-top">
          <Logo linkTo="/dashboard" />
          <div className="header-actions">
            <div className="user-profile-container" ref={dropdownRef}>
              <button type="button" className="user-profile" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
                <span>{user.name || user.email}</span>
                <div className="user-icon">{initials}</div>
              </button>
              {isDropdownOpen && (
                <div className="user-dropdown">
                  <Link to="/profile" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                    Profile
                  </Link>
                  <Form method="post" action="/logout">
                    <button type="submit" className="dropdown-item">
                      Log Out
                    </button>
                  </Form>
                </div>
              )}
            </div>
          </div>
        </div>
        <nav className="main-nav">
          <Link to="/dashboard" className={`nav-item ${activeNav === "organization" ? "active" : ""}`}>
            Organization
          </Link>
          <Link to="#" className={`nav-item ${activeNav === "individual" ? "active" : ""}`}>
            Individual
          </Link>
          <Link to="/settings" className={`nav-item ${activeNav === "settings" ? "active" : ""}`}>
            Settings
          </Link>
        </nav>
      </header>
      <main className="page-container">{children}</main>
    </>
  );
}

interface AppLayoutProps {
  children: React.ReactNode;
  activeNav: "organization" | "individual" | "settings";
  user: {
    name: string | null;
    email: string;
  };
}
