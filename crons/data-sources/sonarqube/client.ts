const DEFAULT_PAGE_SIZE = 100;

export function createSonarQubeClient(env: Record<string, string>): SonarQubeClient {
  const variant = env.SONARQUBE_VARIANT as SonarQubeVariant;
  if (variant !== "cloud" && variant !== "selfhosted") {
    throw new Error(`Invalid SONARQUBE_VARIANT: ${variant}. Must be 'cloud' or 'selfhosted'.`);
  }

  const isCloud = variant === "cloud";
  let baseUrl: string;
  let token: string;
  let organization: string | undefined;

  if (isCloud) {
    if (!env.SONARQUBE_ORGANIZATION) {
      throw new Error("SONARQUBE_ORGANIZATION is required for SonarCloud");
    }
    if (!env.SONARQUBE_TOKEN_CLOUD) {
      throw new Error("SONARQUBE_TOKEN_CLOUD is required for SonarCloud");
    }
    baseUrl = "https://sonarcloud.io";
    token = env.SONARQUBE_TOKEN_CLOUD;
    organization = env.SONARQUBE_ORGANIZATION;
  } else {
    if (!env.SONARQUBE_URL) {
      throw new Error("SONARQUBE_URL is required for Self-Hosted SonarQube");
    }
    if (!env.SONARQUBE_TOKEN) {
      throw new Error("SONARQUBE_TOKEN is required for Self-Hosted SonarQube");
    }
    baseUrl = env.SONARQUBE_URL.replace(/\/$/, "");
    token = env.SONARQUBE_TOKEN;
  }

  // SonarQube uses token as username with empty password for Basic auth
  const credentials = Buffer.from(`${token}:`).toString("base64");
  const headers: Record<string, string> = {
    Authorization: `Basic ${credentials}`,
    Accept: "application/json",
  };

  return {
    baseUrl,
    headers,
    variant,
    organization,

    async request<T>(endpoint: string): Promise<T> {
      const url = `${baseUrl}${endpoint}`;
      const response = await fetch(url, { headers });

      if (!response.ok) {
        const errorText = await response.text();
        throw new SonarQubeApiError(`SonarQube API error: ${response.status} ${response.statusText}`, response.status, errorText);
      }

      return response.json();
    },

    async getProjects(): Promise<SonarQubeProject[]> {
      const projects: SonarQubeProject[] = [];
      let page = 1;

      while (true) {
        const params = new URLSearchParams({
          qualifiers: "TRK",
          ps: String(DEFAULT_PAGE_SIZE),
          p: String(page),
        });
        if (organization) {
          params.set("organization", organization);
        }

        const response = await this.request<SonarQubeProjectsResponse>(`/api/components/search?${params.toString()}`);
        projects.push(...response.components);

        if (projects.length >= response.paging.total) {
          break;
        }
        page++;
      }

      return projects;
    },

    async getProjectMeasures(projectKey: string): Promise<SonarQubeMeasures> {
      const metrics = [
        "coverage",
        "new_coverage",
        "code_smells",
        "bugs",
        "vulnerabilities",
        "duplicated_lines_density",
        "sqale_debt_ratio",
        "complexity",
        "cognitive_complexity",
        "reliability_rating",
        "security_rating",
        "sqale_rating",
      ].join(",");

      const params = new URLSearchParams({
        component: projectKey,
        metricKeys: metrics,
      });

      const response = await this.request<SonarQubeMeasuresResponse>(`/api/measures/component?${params.toString()}`);

      return parseMeasures(response.component.measures);
    },

    async getProjectAnalyses(projectKey: string, from?: Date): Promise<SonarQubeAnalysis[]> {
      const analyses: SonarQubeAnalysis[] = [];
      let page = 1;

      while (true) {
        const params = new URLSearchParams({
          project: projectKey,
          ps: String(DEFAULT_PAGE_SIZE),
          p: String(page),
        });
        if (from) {
          params.set("from", from.toISOString().split("T")[0]);
        }

        const response = await this.request<SonarQubeAnalysesResponse>(`/api/project_analyses/search?${params.toString()}`);
        analyses.push(...response.analyses);

        if (analyses.length >= response.paging.total) {
          break;
        }
        page++;
      }

      return analyses;
    },

    async getIssues(projectKey: string, types: string[], from?: Date): Promise<SonarQubeIssue[]> {
      const issues: SonarQubeIssue[] = [];
      let page = 1;

      while (true) {
        const params = new URLSearchParams({
          componentKeys: projectKey,
          types: types.join(","),
          ps: String(DEFAULT_PAGE_SIZE),
          p: String(page),
        });
        if (from) {
          params.set("createdAfter", from.toISOString().split("T")[0]);
        }

        const response = await this.request<SonarQubeIssuesResponse>(`/api/issues/search?${params.toString()}`);
        issues.push(...response.issues);

        if (issues.length >= response.paging.total) {
          break;
        }
        page++;
      }

      return issues;
    },
  };
}

function parseMeasures(measures: SonarQubeMeasure[]): SonarQubeMeasures {
  const result: SonarQubeMeasures = {};
  for (const measure of measures) {
    result[measure.metric] = measure.value;
  }
  return result;
}

export class SonarQubeApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public responseBody: string
  ) {
    super(message);
    this.name = "SonarQubeApiError";
  }
}

export type SonarQubeVariant = "cloud" | "selfhosted";

export interface SonarQubeClient {
  baseUrl: string;
  headers: Record<string, string>;
  variant: SonarQubeVariant;
  organization?: string;
  request<T>(endpoint: string): Promise<T>;
  getProjects(): Promise<SonarQubeProject[]>;
  getProjectMeasures(projectKey: string): Promise<SonarQubeMeasures>;
  getProjectAnalyses(projectKey: string, from?: Date): Promise<SonarQubeAnalysis[]>;
  getIssues(projectKey: string, types: string[], from?: Date): Promise<SonarQubeIssue[]>;
}

export interface SonarQubeProject {
  key: string;
  name: string;
  qualifier: string;
}

export interface SonarQubeProjectsResponse {
  paging: { pageIndex: number; pageSize: number; total: number };
  components: SonarQubeProject[];
}

export interface SonarQubeMeasure {
  metric: string;
  value: string;
}

export interface SonarQubeMeasuresResponse {
  component: {
    key: string;
    name: string;
    measures: SonarQubeMeasure[];
  };
}

export interface SonarQubeMeasures {
  [key: string]: string | undefined;
}

export interface SonarQubeAnalysis {
  key: string;
  date: string;
  projectVersion?: string;
  buildString?: string;
  revision?: string;
}

export interface SonarQubeAnalysesResponse {
  paging: { pageIndex: number; pageSize: number; total: number };
  analyses: SonarQubeAnalysis[];
}

export interface SonarQubeIssue {
  key: string;
  rule: string;
  severity: string;
  component: string;
  project: string;
  line?: number;
  message: string;
  status: string;
  type: string;
  creationDate: string;
  updateDate: string;
  resolution?: string;
}

export interface SonarQubeIssuesResponse {
  paging: { pageIndex: number; pageSize: number; total: number };
  issues: SonarQubeIssue[];
}
