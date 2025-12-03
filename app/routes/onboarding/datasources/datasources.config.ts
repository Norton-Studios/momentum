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
};

export interface ProviderConfigField {
  key: string;
  label: string;
  type: "text" | "password";
  placeholder: string;
  required: boolean;
}

export interface ProviderConfig {
  fields: ProviderConfigField[];
}
