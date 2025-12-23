import type { ReactNode } from "react";
import { Link } from "react-router";
import { AppLayout } from "~/components/app-layout/app-layout";
import "./settings-layout.css";

export function SettingsLayout({ children, activeTab, user }: SettingsLayoutProps) {
  const tabs = [
    { id: "general", label: "General", href: "/settings" },
    { id: "teams", label: "Teams", href: "/settings/teams" },
    { id: "data-sources", label: "Data Sources", href: "/settings/data-sources" },
    { id: "imports", label: "Imports", href: "/settings/imports" },
  ];

  return (
    <AppLayout activeNav="settings" user={user}>
      <nav className="settings-sub-nav">
        {tabs.map((tab) => (
          <Link key={tab.id} to={tab.href} className={`sub-nav-item ${activeTab === tab.id ? "active" : ""}`}>
            {tab.label}
          </Link>
        ))}
      </nav>
      <div className="settings-content">{children}</div>
    </AppLayout>
  );
}

interface SettingsLayoutProps {
  children: ReactNode;
  activeTab: "general" | "teams" | "data-sources" | "imports";
  user: {
    name: string | null;
    email: string;
  };
}
