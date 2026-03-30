import { describe, it, expect, vi } from "vitest";
import { seedCompany } from "../src/paperclip/seeder.js";
import type { CompanyTemplate } from "../src/schemas.js";

describe("seedCompany", () => {
  const template: CompanyTemplate = {
    name: "Test Agency",
    mission: "Test mission statement for validation",
    agents: [
      {
        slug: "director",
        name: "Director",
        role: "ceo",
        budget: 25,
        heartbeat: "0 9 * * *",
        toolsets: ["terminal", "file", "web"],
        internetTools: [],
        goals: ["Lead the team"],
      },
      {
        slug: "writer",
        name: "Writer",
        role: "cmo",
        budget: 80,
        heartbeat: "0 8 * * 1-5",
        toolsets: ["terminal", "file", "web"],
        internetTools: ["jina"],
        reportsTo: "director",
        goals: ["Write posts", "Research topics"],
      },
    ],
  };

  it("creates agents in dependency order (director before writer)", async () => {
    const callOrder: string[] = [];
    const mockClient = {
      createCompany: vi.fn().mockResolvedValue({ id: "company-1" }),
      createGoal: vi.fn().mockResolvedValue({ id: "goal-1" }),
      createSecret: vi.fn().mockResolvedValue(undefined),
      createAgent: vi.fn().mockImplementation(async (_companyId: string, req: { name: string }) => {
        callOrder.push(req.name);
        return { id: `agent-${req.name}` };
      }),
      createAgentKey: vi.fn().mockResolvedValue({ key: "ak-123" }),
      createIssue: vi.fn().mockResolvedValue({ id: "issue-1", identifier: "PAP-1" }),
    };

    await seedCompany(mockClient, template, "sk-test");
    expect(callOrder[0]).toBe("Director");
    expect(callOrder[1]).toBe("Writer");
  });

  it("sets reportsTo on child agents using parent agent ID", async () => {
    const mockClient = {
      createCompany: vi.fn().mockResolvedValue({ id: "company-1" }),
      createGoal: vi.fn().mockResolvedValue({ id: "goal-1" }),
      createSecret: vi.fn().mockResolvedValue(undefined),
      createAgent: vi.fn().mockImplementation(async (_companyId: string, req: { name: string }) => {
        return { id: `id-${req.name.toLowerCase()}` };
      }),
      createAgentKey: vi.fn().mockResolvedValue({ key: "ak-123" }),
      createIssue: vi.fn().mockResolvedValue({ id: "issue-1", identifier: "PAP-1" }),
    };

    await seedCompany(mockClient, template, "sk-test");
    const writerCall = mockClient.createAgent.mock.calls[1];
    expect(writerCall[1].reportsTo).toBe("id-director");
  });

  it("creates issues for each agent goal", async () => {
    const mockClient = {
      createCompany: vi.fn().mockResolvedValue({ id: "company-1" }),
      createGoal: vi.fn().mockResolvedValue({ id: "goal-1" }),
      createSecret: vi.fn().mockResolvedValue(undefined),
      createAgent: vi.fn().mockResolvedValue({ id: "agent-1" }),
      createAgentKey: vi.fn().mockResolvedValue({ key: "ak-123" }),
      createIssue: vi.fn().mockResolvedValue({ id: "issue-1", identifier: "PAP-1" }),
    };

    await seedCompany(mockClient, template, "sk-test");
    expect(mockClient.createIssue).toHaveBeenCalledTimes(3);
  });
});
