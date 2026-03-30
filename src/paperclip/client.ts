import type {
  Company, Agent, Issue, Goal, HealthCheck,
  CreateAgentRequest, CreateIssueRequest, CreateGoalRequest, CreateSecretRequest,
} from "../types.js";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const NO_RETRY_STATUSES = [409, 422];

export class PaperclipClient {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(apiUrl: string, token: string) {
    this.baseUrl = apiUrl;
    this.headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: { ...this.headers, ...options.headers as Record<string, string> },
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          const error = new Error(
            `Paperclip API error: ${response.status} ${response.statusText} - ${JSON.stringify(body)}`
          );
          (error as unknown as Record<string, unknown>).status = response.status;

          if (NO_RETRY_STATUSES.includes(response.status)) {
            throw error;
          }

          lastError = error;
          if (attempt < MAX_RETRIES - 1) {
            await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
            continue;
          }
          throw error;
        }

        const text = await response.text();
        if (!text) return undefined as unknown as T;
        return JSON.parse(text) as T;
      } catch (error) {
        if (error instanceof Error && (error as unknown as Record<string, unknown>).status) {
          throw error;
        }
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < MAX_RETRIES - 1) {
          await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
          continue;
        }
      }
    }

    throw lastError ?? new Error("Request failed after retries");
  }

  async healthCheck(): Promise<HealthCheck> {
    return this.request<HealthCheck>("/api/health");
  }

  async createCompany(name: string, mission: string): Promise<Company> {
    return this.request<Company>("/api/companies", {
      method: "POST",
      body: JSON.stringify({ name, mission }),
    });
  }

  async createAgent(companyId: string, agent: CreateAgentRequest): Promise<Agent> {
    return this.request<Agent>(`/api/companies/${companyId}/agents`, {
      method: "POST",
      body: JSON.stringify(agent),
    });
  }

  async createAgentKey(agentId: string): Promise<{ key: string }> {
    return this.request<{ key: string }>(`/api/agents/${agentId}/keys`, {
      method: "POST",
    });
  }

  async createIssue(companyId: string, issue: CreateIssueRequest): Promise<Issue> {
    return this.request<Issue>(`/api/companies/${companyId}/issues`, {
      method: "POST",
      body: JSON.stringify(issue),
    });
  }

  async createGoal(companyId: string, goal: CreateGoalRequest): Promise<Goal> {
    return this.request<Goal>(`/api/companies/${companyId}/goals`, {
      method: "POST",
      body: JSON.stringify(goal),
    });
  }

  async createSecret(companyId: string, secret: CreateSecretRequest): Promise<void> {
    await this.request<unknown>(`/api/companies/${companyId}/secrets`, {
      method: "POST",
      body: JSON.stringify(secret),
    });
  }

  async listAgents(companyId: string): Promise<Agent[]> {
    return this.request<Agent[]>(`/api/companies/${companyId}/agents`);
  }

  async listIssues(companyId: string): Promise<Issue[]> {
    return this.request<Issue[]>(`/api/companies/${companyId}/issues`);
  }
}
