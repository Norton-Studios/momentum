const DEFAULT_PAGE_SIZE = 100;
const MAX_RESULTS = 1000;

export function createJiraClient(env: Record<string, string>): JiraClient {
  const variant = env.JIRA_VARIANT as JiraVariant;
  if (variant !== "cloud" && variant !== "datacenter") {
    throw new Error(`Invalid JIRA_VARIANT: ${variant}. Must be 'cloud' or 'datacenter'.`);
  }

  const isCloud = variant === "cloud";

  let baseUrl: string;
  if (isCloud) {
    if (!env.JIRA_DOMAIN) {
      throw new Error("JIRA_DOMAIN is required for Jira Cloud");
    }
    baseUrl = `https://${env.JIRA_DOMAIN}.atlassian.net`;
  } else {
    if (!env.JIRA_SERVER_URL) {
      throw new Error("JIRA_SERVER_URL is required for Jira Data Center");
    }
    baseUrl = env.JIRA_SERVER_URL.replace(/\/$/, "");
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (isCloud) {
    if (!env.JIRA_EMAIL || !env.JIRA_API_TOKEN) {
      throw new Error("JIRA_EMAIL and JIRA_API_TOKEN are required for Jira Cloud");
    }
    const credentials = Buffer.from(`${env.JIRA_EMAIL}:${env.JIRA_API_TOKEN}`).toString("base64");
    headers.Authorization = `Basic ${credentials}`;
  } else {
    if (!env.JIRA_PAT) {
      throw new Error("JIRA_PAT is required for Jira Data Center");
    }
    headers.Authorization = `Bearer ${env.JIRA_PAT}`;
  }

  const apiVersion = isCloud ? "3" : "2";

  return {
    baseUrl,
    headers,
    apiVersion,
    variant,

    async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
      const url = `${baseUrl}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: { ...headers, ...options.headers },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new JiraApiError(`Jira API error: ${response.status} ${response.statusText}`, response.status, errorText);
      }

      return response.json();
    },

    async getMyself(): Promise<JiraUser> {
      return this.request(`/rest/api/${apiVersion}/myself`);
    },

    async getProjects(): Promise<JiraProject[]> {
      if (isCloud) {
        return this.getProjectsPaginated();
      }
      return this.request(`/rest/api/${apiVersion}/project`);
    },

    async getProjectsPaginated(): Promise<JiraProject[]> {
      const projects: JiraProject[] = [];
      let startAt = 0;

      while (true) {
        const response = await this.request<JiraProjectsResponse>(`/rest/api/${apiVersion}/project/search?startAt=${startAt}&maxResults=${DEFAULT_PAGE_SIZE}`);
        projects.push(...response.values);

        if (response.isLast || projects.length >= response.total) {
          break;
        }
        startAt += DEFAULT_PAGE_SIZE;
      }

      return projects;
    },

    async getBoards(projectKeyOrId?: string): Promise<JiraBoard[]> {
      const boards: JiraBoard[] = [];
      let startAt = 0;

      while (true) {
        let url = `/rest/agile/1.0/board?startAt=${startAt}&maxResults=${DEFAULT_PAGE_SIZE}`;
        if (projectKeyOrId) {
          url += `&projectKeyOrId=${projectKeyOrId}`;
        }

        const response = await this.request<JiraBoardsResponse>(url);
        boards.push(...response.values);

        if (response.isLast || boards.length >= (response.total ?? boards.length)) {
          break;
        }
        startAt += DEFAULT_PAGE_SIZE;
      }

      return boards;
    },

    async getSprints(boardId: number): Promise<JiraSprint[]> {
      const sprints: JiraSprint[] = [];
      let startAt = 0;

      while (true) {
        const response = await this.request<JiraSprintsResponse>(`/rest/agile/1.0/board/${boardId}/sprint?startAt=${startAt}&maxResults=${DEFAULT_PAGE_SIZE}`);
        sprints.push(...response.values);

        if (response.isLast || sprints.length >= (response.total ?? sprints.length)) {
          break;
        }
        startAt += DEFAULT_PAGE_SIZE;
      }

      return sprints;
    },

    async searchIssues(jql: string, fields: string[] = ["*all"], startAt = 0): Promise<JiraSearchResponse> {
      const body = {
        jql,
        startAt,
        maxResults: DEFAULT_PAGE_SIZE,
        fields,
      };

      return this.request(`/rest/api/${apiVersion}/search`, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },

    async getAllIssues(jql: string, fields: string[] = ["*all"]): Promise<JiraIssue[]> {
      const issues: JiraIssue[] = [];
      let startAt = 0;

      while (issues.length < MAX_RESULTS) {
        const response = await this.searchIssues(jql, fields, startAt);
        issues.push(...response.issues);

        if (startAt + response.issues.length >= response.total) {
          break;
        }
        startAt += DEFAULT_PAGE_SIZE;
      }

      return issues;
    },

    async getIssueChangelog(issueIdOrKey: string): Promise<JiraChangelogResponse> {
      const changelogs: JiraChangelog[] = [];
      let startAt = 0;

      while (true) {
        const response = await this.request<JiraChangelogResponse>(`/rest/api/${apiVersion}/issue/${issueIdOrKey}/changelog?startAt=${startAt}&maxResults=${DEFAULT_PAGE_SIZE}`);
        changelogs.push(...response.values);

        if (response.isLast || changelogs.length >= response.total) {
          break;
        }
        startAt += DEFAULT_PAGE_SIZE;
      }

      return { values: changelogs, total: changelogs.length, isLast: true };
    },
  };
}

export function formatJiraDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export class JiraApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public responseBody: string
  ) {
    super(message);
    this.name = "JiraApiError";
  }
}

export type JiraVariant = "cloud" | "datacenter";

export interface JiraClient {
  baseUrl: string;
  headers: Record<string, string>;
  apiVersion: string;
  variant: JiraVariant;
  request<T>(endpoint: string, options?: RequestInit): Promise<T>;
  getMyself(): Promise<JiraUser>;
  getProjects(): Promise<JiraProject[]>;
  getProjectsPaginated(): Promise<JiraProject[]>;
  getBoards(projectKeyOrId?: string): Promise<JiraBoard[]>;
  getSprints(boardId: number): Promise<JiraSprint[]>;
  searchIssues(jql: string, fields?: string[], startAt?: number): Promise<JiraSearchResponse>;
  getAllIssues(jql: string, fields?: string[]): Promise<JiraIssue[]>;
  getIssueChangelog(issueIdOrKey: string): Promise<JiraChangelogResponse>;
}

export interface JiraUser {
  accountId?: string;
  key?: string;
  name?: string;
  emailAddress?: string;
  displayName: string;
  active: boolean;
  avatarUrls?: Record<string, string>;
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  description?: string;
  projectTypeKey?: string;
  style?: string;
  self?: string;
}

export interface JiraProjectsResponse {
  values: JiraProject[];
  total: number;
  isLast: boolean;
}

export interface JiraBoard {
  id: number;
  name: string;
  type: "scrum" | "kanban" | "simple";
  location?: {
    projectId?: number;
    projectKey?: string;
    projectName?: string;
  };
}

export interface JiraBoardsResponse {
  values: JiraBoard[];
  total?: number;
  isLast: boolean;
}

export interface JiraSprint {
  id: number;
  name: string;
  state: "active" | "closed" | "future";
  goal?: string;
  startDate?: string;
  endDate?: string;
  completeDate?: string;
  originBoardId?: number;
}

export interface JiraSprintsResponse {
  values: JiraSprint[];
  total?: number;
  isLast: boolean;
}

export interface JiraIssue {
  id: string;
  key: string;
  self: string;
  fields: {
    summary: string;
    description?: string | JiraAdfDocument;
    issuetype: { id: string; name: string };
    status: { id: string; name: string; statusCategory?: { key: string } };
    priority?: { id: string; name: string };
    assignee?: JiraUser;
    reporter?: JiraUser;
    created: string;
    updated: string;
    resolutiondate?: string;
    customfield_10016?: number; // Story points (common field ID)
    customfield_10020?: { id: number }[]; // Sprint field (common field ID)
    [key: string]: unknown;
  };
}

export interface JiraAdfDocument {
  type: "doc";
  version: number;
  content: unknown[];
}

export interface JiraSearchResponse {
  issues: JiraIssue[];
  total: number;
  startAt: number;
  maxResults: number;
}

export interface JiraChangelog {
  id: string;
  author: JiraUser;
  created: string;
  items: JiraChangelogItem[];
}

export interface JiraChangelogItem {
  field: string;
  fieldtype: string;
  fieldId?: string;
  from?: string;
  fromString?: string;
  to?: string;
  toString?: string;
}

export interface JiraChangelogResponse {
  values: JiraChangelog[];
  total: number;
  isLast: boolean;
}
