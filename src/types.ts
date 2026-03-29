import type { AgentDef, CompanyTemplate } from "./schemas.js";

export type { AgentDef, CompanyTemplate };

export interface CreateAgentRequest {
  name: string;
  role?: string;
  title?: string;
  adapterType: string;
  adapterConfig: {
    model?: string;
    maxIterations?: number;
    timeoutSec?: number;
    persistSession?: boolean;
    enabledToolsets?: string[];
  };
  reportsTo?: string;
  budgetMonthlyCents?: number;
}

export interface CreateIssueRequest {
  title: string;
  description?: string;
  status?: "backlog" | "todo" | "in_progress" | "done" | "cancelled";
  priority?: "urgent" | "high" | "medium" | "low" | "none";
  assigneeAgentId?: string;
  projectId?: string;
}

export interface CreateGoalRequest {
  title: string;
  description?: string;
  parentGoalId?: string;
}

export interface CreateSecretRequest {
  name: string;
  value: string;
  provider: string;
}

export interface Company {
  id: string;
  name: string;
  mission?: string;
}

export interface Agent {
  id: string;
  name: string;
  role?: string;
  status?: string;
}

export interface Issue {
  id: string;
  identifier: string;
  title: string;
  status: string;
}

export interface Goal {
  id: string;
  title: string;
}

export interface HealthCheck {
  status: string;
  deploymentMode?: string;
}

export interface WizardConfig {
  deployTarget: "local" | "vps";
  provider: "openrouter" | "anthropic" | "openai";
  apiKey: string;
  model: string;
  template: CompanyTemplate;
  internetTools: string[];
  sshHost?: string;
  sshUser?: string;
  sshKeyPath?: string;
  domain?: string;
}
