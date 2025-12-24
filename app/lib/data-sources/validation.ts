import { PROVIDER_CONFIGS } from "./provider-configs";

export type DataSourceProvider = "GITHUB" | "GITLAB" | "BITBUCKET" | "JENKINS" | "CIRCLECI" | "SONARQUBE" | "JIRA";

const PROVIDER_MAP: Record<string, DataSourceProvider> = {
  github: "GITHUB",
  gitlab: "GITLAB",
  bitbucket: "BITBUCKET",
  jenkins: "JENKINS",
  circleci: "CIRCLECI",
  sonarqube: "SONARQUBE",
  jira: "JIRA",
};

export function getProviderEnum(provider: string): DataSourceProvider | null {
  return PROVIDER_MAP[provider] || null;
}

export function validateRequiredFields(provider: string, configs: Record<string, string>): Record<string, string> | null {
  const providerConfig = PROVIDER_CONFIGS[provider];
  for (const field of providerConfig.fields) {
    if (field.showWhen) {
      const conditionMet = Object.entries(field.showWhen).every(([key, value]) => configs[key] === value);
      if (!conditionMet) {
        continue;
      }
    }
    if (field.required && !configs[field.key]) {
      return { [field.key]: `${field.label} is required` };
    }
  }
  return null;
}
