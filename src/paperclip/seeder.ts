import type { CompanyTemplate } from "../schemas.js";
import type { PaperclipClient } from "./client.js";

interface SeedResult {
  companyId: string;
  agentMap: Record<string, string>;
}

function topologicalSort(agents: CompanyTemplate["agents"]): CompanyTemplate["agents"] {
  const sorted: CompanyTemplate["agents"] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(slug: string) {
    if (visited.has(slug)) return;
    if (visiting.has(slug)) {
      throw new Error(`Circular dependency detected: agent "${slug}" forms a cycle in reportsTo`);
    }
    const agent = agents.find(a => a.slug === slug);
    if (!agent) return;
    visiting.add(slug);
    if (agent.reportsTo && !visited.has(agent.reportsTo)) {
      visit(agent.reportsTo);
    }
    visiting.delete(slug);
    visited.add(slug);
    sorted.push(agent);
  }

  for (const agent of agents) {
    visit(agent.slug);
  }

  return sorted;
}

export async function seedCompany(
  client: Pick<PaperclipClient,
    "createCompany" | "createGoal" | "createSecret" |
    "createAgent" | "createAgentKey" | "createIssue"
  >,
  template: CompanyTemplate,
  llmApiKey: string
): Promise<SeedResult> {
  const company = await client.createCompany(template.name, template.mission);
  await client.createGoal(company.id, { title: template.mission });
  await client.createSecret(company.id, {
    name: "LLM_API_KEY",
    value: llmApiKey,
    provider: "local_encrypted",
  });

  const agentMap: Record<string, string> = {};
  const sortedAgents = topologicalSort(template.agents);

  for (const agentDef of sortedAgents) {
    const agent = await client.createAgent(company.id, {
      name: agentDef.name,
      role: agentDef.role,
      adapterType: "openclaw_gateway",
      adapterConfig: {
        url: "ws://zeroclaw:42617/ws/chat",
        model: "anthropic/claude-sonnet-4",
        enabledToolsets: agentDef.toolsets,
        sessionKeyStrategy: "issue",
        persistSession: true,
        timeoutSec: 300,
        autoPairOnFirstConnect: true,
      },
      reportsTo: agentDef.reportsTo ? agentMap[agentDef.reportsTo] : undefined,
      budgetMonthlyCents: agentDef.budget * 100,
    });
    agentMap[agentDef.slug] = agent.id;
    await client.createAgentKey(agent.id);
  }

  for (const agentDef of sortedAgents) {
    for (const goalText of agentDef.goals) {
      await client.createIssue(company.id, {
        title: goalText,
        status: "todo",
        assigneeAgentId: agentMap[agentDef.slug],
      });
    }
  }

  return { companyId: company.id, agentMap };
}
