import { Link } from "react-router";
import { Button } from "../components/button";
import { FeatureCard } from "../components/feature-card";
import { Footer } from "../components/footer";
import { Header } from "../components/header";
import { MetricBox } from "../components/metric-box";
import "../styles/homepage.css";

export function meta() {
  return [
    { title: "Momentum - Developer Productivity Platform" },
    {
      name: "description",
      content: "Turn data into developer momentum with comprehensive productivity metrics",
    },
  ];
}

export default function Index() {
  return (
    <>
      <Header />

      <section className="hero">
        <h1>
          Turn Data into Developer <span className="accent">Momentum</span>
        </h1>
        <p>Comprehensive developer productivity metrics that help teams ship faster, build better, and work smarter. Connect your tools and unlock insights in minutes.</p>
        <div className="hero-cta">
          <Link to="/register">
            <Button>Start Free Trial</Button>
          </Link>
          <Link to="#features" className="btn-secondary">
            See How It Works
          </Link>
        </div>
      </section>

      <section className="features">
        <div className="section-header">
          <h2>Everything You Need to Track Productivity</h2>
          <p>From code commits to production deployments, measure every aspect of your development workflow.</p>
        </div>
        <div className="feature-grid">
          <FeatureCard
            number="01"
            title="Comprehensive Metrics"
            description="Track delivery velocity, code quality, pipeline stability, and team collaboration across all your repositories and tools."
          />
          <FeatureCard
            number="02"
            title="Connect Anywhere"
            description="Integrate with GitHub, GitLab, Jenkins, JIRA, SonarQube, and more. One platform for all your development data."
          />
          <FeatureCard
            number="03"
            title="Real-Time Insights"
            description="Automated data collection every 15 minutes keeps your metrics fresh and actionable without manual effort."
          />
          <FeatureCard
            number="04"
            title="Team & Individual Views"
            description="Organization-wide dashboards for leaders, personal metrics for developers. Privacy controls built-in."
          />
          <FeatureCard
            number="05"
            title="Self-Hosted Option"
            description="Deploy on your infrastructure. Your data never leaves your environment. Complete control and security."
          />
          <FeatureCard
            number="06"
            title="Actionable Dashboards"
            description="Beautiful visualizations with drill-down capabilities, export options, and intelligent insights to drive improvements."
          />
        </div>
      </section>

      <section className="metrics-preview">
        <div className="section-header">
          <h2>Metrics That Matter</h2>
          <p>Real-time visibility into the metrics that drive software delivery performance.</p>
        </div>
        <div className="metrics-grid">
          <MetricBox label="Deployment Frequency" value="24" trend="↑ 33% this week" trendType="positive" />
          <MetricBox label="Pipeline Success Rate" value="94.5%" trend="↓ 2.3% decrease" trendType="negative" />
          <MetricBox label="Average Cycle Time" value="2.8 days" trend="↑ 0.5 days slower" trendType="negative" />
          <MetricBox label="Code Coverage" value="78%" trend="↑ 2% increase" trendType="positive" />
          <MetricBox label="Active Contributors" value="23" trend="Across 50 repositories" />
          <MetricBox label="Security Vulnerabilities" value="31" trend="↑ 8 new this week" trendType="negative" />
        </div>
      </section>

      <section className="cta-section">
        <h2>Ready to Build Better Software?</h2>
        <p>Join development teams using Momentum to ship faster and measure what matters. Get started in minutes.</p>
        <Link to="/register">
          <Button>Start Your Free Trial</Button>
        </Link>
      </section>

      <Footer />
    </>
  );
}
