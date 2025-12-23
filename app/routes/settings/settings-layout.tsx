import type { ReactNode } from "react";
import { Link } from "react-router";
import "./settings-layout.css";

export function SettingsLayout({ children, activeTab }: SettingsLayoutProps) {
  const tabs = [
    { id: "general", label: "General", href: "/settings" },
    { id: "teams", label: "Teams", href: "/settings/teams" },
    { id: "data-sources", label: "Data Sources", href: "/settings/data-sources" },
    { id: "imports", label: "Imports", href: "/settings/imports" },
  ];

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1 className="settings-title">Settings</h1>
        <p className="settings-subtitle">Manage your organization, teams, and data sources</p>
      </div>

      <nav className="settings-tabs">
        {tabs.map((tab) => (
          <Link key={tab.id} to={tab.href} className={`settings-tab ${activeTab === tab.id ? "active" : ""}`}>
            {tab.label}
          </Link>
        ))}
      </nav>

      <div className="settings-content">{children}</div>
    </div>
  );
}

interface SettingsLayoutProps {
  children: ReactNode;
  activeTab: "general" | "teams" | "data-sources" | "imports";
}
