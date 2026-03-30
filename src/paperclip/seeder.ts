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
  llmApiKey: string,
  openClawToken: string = "",
  gatewayPort: number = 42617,
): Promise<SeedResult> {
  const company = await client.createCompany(template.name, template.mission);
  await client.createGoal(company.id, { title: template.mission });
  await client.createSecret(company.id, {
    name: "LLM_API_KEY",
    value: llmApiKey,
    provider: "local_encrypted",
  });

  const agentMap: Record<string, string> = {};
  const slugs = new Set(template.agents.map(a => a.slug));
  const sortedAgents = topologicalSort(template.agents);

  for (const agentDef of sortedAgents) {
    if (agentDef.reportsTo && !slugs.has(agentDef.reportsTo)) {
      throw new Error(`Agent "${agentDef.slug}" reportsTo "${agentDef.reportsTo}" which does not exist`);
    }

    const agent = await client.createAgent(company.id, {
      name: agentDef.name,
      role: agentDef.role,
      adapterType: "openclaw_gateway",
      adapterConfig: {
        url: `ws://openclaw:${gatewayPort}/ws/chat`,
        enabledToolsets: agentDef.toolsets,
        sessionKeyStrategy: "issue",
        persistSession: true,
        timeoutSec: 300,
        ...(openClawToken ? { authToken: openClawToken } : {}),
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
