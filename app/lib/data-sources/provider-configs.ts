export const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  github: {
    fields: [
      { key: "GITHUB_TOKEN", label: "Personal Access Token", type: "password", placeholder: "ghp_xxxxxxxxxxxx", required: true },
      { key: "GITHUB_ORG", label: "Organization", type: "text", placeholder: "my-organization", required: true },
    ],
  },
  gitlab: {
    fields: [
      { key: "GITLAB_TOKEN", label: "Personal Access Token", type: "password", placeholder: "glpat-xxxxxxxxxxxx", required: true },
      { key: "GITLAB_HOST", label: "GitLab URL", type: "text", placeholder: "https://gitlab.com", required: false },
    ],
  },
  jenkins: {
    fields: [
      { key: "JENKINS_URL", label: "Jenkins URL", type: "text", placeholder: "https://jenkins.example.com", required: true },
      { key: "JENKINS_TOKEN", label: "API Token", type: "password", placeholder: "xxxxxxxxxxxx", required: true },
    ],
  },
  circleci: {
    fields: [{ key: "CIRCLECI_TOKEN", label: "API Token", type: "password", placeholder: "xxxxxxxxxxxx", required: true }],
  },
  sonarqube: {
    fields: [
      { key: "SONARQUBE_URL", label: "SonarQube URL", type: "text", placeholder: "https://sonarqube.example.com", required: true },
      { key: "SONARQUBE_TOKEN", label: "API Token", type: "password", placeholder: "xxxxxxxxxxxx", required: true },
    ],
  },
  jira: {
    fields: [
      {
        key: "JIRA_VARIANT",
        label: "Jira Version",
        type: "select",
        placeholder: "",
        required: true,
        options: [
          { value: "cloud", label: "Jira Cloud (SaaS)" },
          { value: "datacenter", label: "Jira Data Center (Self-hosted)" },
        ],
      },
      { key: "JIRA_DOMAIN", label: "Atlassian Domain", type: "text", placeholder: "your-company", required: true, showWhen: { JIRA_VARIANT: "cloud" } },
      { key: "JIRA_EMAIL", label: "Email", type: "text", placeholder: "user@example.com", required: true, showWhen: { JIRA_VARIANT: "cloud" } },
      { key: "JIRA_API_TOKEN", label: "API Token", type: "password", placeholder: "xxxxxxxxxxxx", required: true, showWhen: { JIRA_VARIANT: "cloud" } },
      { key: "JIRA_SERVER_URL", label: "Server URL", type: "text", placeholder: "https://jira.company.com", required: true, showWhen: { JIRA_VARIANT: "datacenter" } },
      { key: "JIRA_PAT", label: "Personal Access Token", type: "password", placeholder: "xxxxxxxxxxxx", required: true, showWhen: { JIRA_VARIANT: "datacenter" } },
    ],
  },
};

export interface ProviderConfigField {
  key: string;
  label: string;
  type: "text" | "password" | "select";
  placeholder: string;
  required: boolean;
  options?: { value: string; label: string }[];
  showWhen?: Record<string, string>;
}

export interface ProviderConfig {
  fields: ProviderConfigField[];
}
