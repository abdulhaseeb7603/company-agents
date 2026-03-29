import { describe, it, expect } from "vitest";
import { AgentDefSchema, CompanyTemplateSchema } from "../src/schemas.js";

describe("AgentDefSchema", () => {
  const validAgent = {
    slug: "content-writer",
    name: "Content Writer",
    role: "content",
    budget: 80,
    heartbeat: "0 9 * * 1-5",
    toolsets: ["terminal", "file", "web"],
    internetTools: ["jina"],
    goals: ["Write 3 blog posts per week"],
  };

  it("parses a valid agent definition", () => {
    const result = AgentDefSchema.safeParse(validAgent);
    expect(result.success).toBe(true);
  });

  it("rejects missing agent name", () => {
    const result = AgentDefSchema.safeParse({ ...validAgent, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid slug format", () => {
    const result = AgentDefSchema.safeParse({ ...validAgent, slug: "Bad Slug!" });
    expect(result.success).toBe(false);
  });

  it("rejects budget below 1", () => {
    const result = AgentDefSchema.safeParse({ ...validAgent, budget: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects budget above 500", () => {
    const result = AgentDefSchema.safeParse({ ...validAgent, budget: 501 });
    expect(result.success).toBe(false);
  });

  it("rejects empty goals array", () => {
    const result = AgentDefSchema.safeParse({ ...validAgent, goals: [] });
    expect(result.success).toBe(false);
  });

  it("rejects invalid toolset name", () => {
    const result = AgentDefSchema.safeParse({
      ...validAgent,
      toolsets: ["invalid_toolset"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid internet tool name", () => {
    const result = AgentDefSchema.safeParse({
      ...validAgent,
      internetTools: ["invalid_tool"],
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional reportsTo", () => {
    const result = AgentDefSchema.safeParse({
      ...validAgent,
      reportsTo: "director",
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional soulTemplate", () => {
    const result = AgentDefSchema.safeParse({
      ...validAgent,
      soulTemplate: "agency-agents/marketing/content-strategist",
    });
    expect(result.success).toBe(true);
  });

  it("defaults internetTools to empty array", () => {
    const { internetTools, ...agentWithoutTools } = validAgent;
    const result = AgentDefSchema.safeParse(agentWithoutTools);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.internetTools).toEqual([]);
    }
  });
});

describe("CompanyTemplateSchema", () => {
  const validTemplate = {
    name: "Content Agency",
    mission: "Create high-quality content that drives engagement and revenue",
    agents: [
      {
        slug: "director",
        name: "Agency Director",
        role: "ceo",
        budget: 25,
        heartbeat: "0 9 * * 1-5",
        toolsets: ["terminal", "file", "web"],
        goals: ["Review all content before publication"],
      },
    ],
  };

  it("parses a valid company template", () => {
    const result = CompanyTemplateSchema.safeParse(validTemplate);
    expect(result.success).toBe(true);
  });

  it("rejects empty company name", () => {
    const result = CompanyTemplateSchema.safeParse({ ...validTemplate, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects mission shorter than 10 characters", () => {
    const result = CompanyTemplateSchema.safeParse({ ...validTemplate, mission: "short" });
    expect(result.success).toBe(false);
  });

  it("rejects empty agents array", () => {
    const result = CompanyTemplateSchema.safeParse({ ...validTemplate, agents: [] });
    expect(result.success).toBe(false);
  });
});
