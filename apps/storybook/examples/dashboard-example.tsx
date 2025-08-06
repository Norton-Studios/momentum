import React from "react";
import { Button, MetricCard, DateRangeSelector, Sidebar, Chart, type NavItem } from "@mmtm/components";
import type { ChartData } from "chart.js";

const navigationItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "organization", label: "Organization", icon: "🏢" },
  {
    id: "teams",
    label: "Teams",
    icon: "👥",
    children: [
      { id: "teams-all", label: "All Teams Comparison" },
      { id: "teams-individual", label: "Individual Team View" },
    ],
  },
  {
    id: "contributors",
    label: "Contributors",
    icon: "👤",
    children: [
      { id: "contributors-all", label: "All Contributors" },
      { id: "contributors-individual", label: "Individual View" },
    ],
  },
];

const chartData: ChartData<"line"> = {
  labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
  datasets: [
    {
      label: "Commits",
      data: [65, 78, 82, 91, 85, 97],
      borderColor: "#667eea",
      backgroundColor: "rgba(102, 126, 234, 0.1)",
      tension: 0.4,
      fill: true,
    },
    {
      label: "Deployments",
      data: [45, 52, 58, 65, 61, 72],
      borderColor: "#f093fb",
      backgroundColor: "rgba(240, 147, 251, 0.1)",
      tension: 0.4,
      fill: true,
    },
  ],
};

export const DashboardExample: React.FC = () => {
  const [activeNav, setActiveNav] = React.useState("dashboard");

  return (
    <div style={{ display: "flex", height: "100vh", background: "#f7fafc" }}>
      <Sidebar
        items={navigationItems}
        activeItem={activeNav}
        onItemClick={(item) => setActiveNav(item.id)}
        logo={
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                background: "var(--gradient-primary)",
                borderRadius: "8px",
              }}
            />
            <span style={{ fontWeight: 600, fontSize: "1.25rem" }}>Momentum</span>
          </div>
        }
      />

      <main style={{ flex: 1, padding: "2rem", overflow: "auto" }}>
        <header style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1>Dashboard</h1>
          <DateRangeSelector onChange={(range) => console.log("Selected:", range)} />
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          <MetricCard title="CVE Count" value="23" trend={{ value: 12, direction: "down" }} gradient="cve" icon="🛡️" />
          <MetricCard title="Pipeline Stability" value="94.2%" trend={{ value: 8, direction: "up" }} gradient="stability" icon="✅" />
          <MetricCard title="Delivery Velocity" value="2.4x" trend={{ value: 15, direction: "up" }} gradient="velocity" icon="🚀" />
          <MetricCard title="Performance" value="1.2s" trend={{ value: 2, direction: "up" }} gradient="performance" icon="⚡" />
        </div>

        <div style={{ marginBottom: "2rem" }}>
          <Chart type="line" data={chartData} title="Delivery Velocity Trend" height={400} />
        </div>

        <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
          <Button variant="primary" gradient>
            View Full Report
          </Button>
          <Button variant="secondary">Export Data</Button>
        </div>
      </main>
    </div>
  );
};
