import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { createHermesHome } from "../src/generators/hermes-home.js";
import type { AgentDef } from "../src/schemas.js";

describe("createHermesHome", () => {
  let tmpDir: string;

  const agent: AgentDef = {
    slug: "content-writer",
    name: "Content Writer",
    role: "content",
    budget: 80,
    heartbeat: "0 9 * * 1-5",
    toolsets: ["terminal", "file", "web", "browser"],
    internetTools: ["jina"],
    goals: ["Write blog posts"],
  };

  const soulContent = "# Personality\n\nYou are a content strategist at {{company_name}}.\n\n## Your Role\n\nCreate content for {{company_name}}.";

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "company-agents-test-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("creates the correct directory structure", async () => {
    await createHermesHome(tmpDir, agent, "Acme Corp", soulContent);
    const hermesDir = path.join(tmpDir, "content-writer", ".hermes");
    expect((await fs.stat(hermesDir)).isDirectory()).toBe(true);
    expect((await fs.stat(path.join(hermesDir, "memories"))).isDirectory()).toBe(true);
    expect((await fs.stat(path.join(hermesDir, "skills"))).isDirectory()).toBe(true);
    expect((await fs.stat(path.join(hermesDir, "sessions"))).isDirectory()).toBe(true);
  });

  it("writes SOUL.md with company name replaced", async () => {
    await createHermesHome(tmpDir, agent, "Acme Corp", soulContent);
    const content = await fs.readFile(path.join(tmpDir, "content-writer", ".hermes", "SOUL.md"), "utf-8");
    expect(content).toContain("Acme Corp");
    expect(content).not.toContain("{{company_name}}");
  });

  it("writes config.yaml with correct model and provider", async () => {
    await createHermesHome(tmpDir, agent, "Acme Corp", soulContent, {
      model: "anthropic/claude-sonnet-4",
      provider: "openrouter",
    });
    const content = await fs.readFile(path.join(tmpDir, "content-writer", ".hermes", "config.yaml"), "utf-8");
    expect(content).toContain("anthropic/claude-sonnet-4");
    expect(content).toContain("openrouter");
  });

  it("creates empty MEMORY.md in memories/", async () => {
    await createHermesHome(tmpDir, agent, "Acme Corp", soulContent);
    const content = await fs.readFile(path.join(tmpDir, "content-writer", ".hermes", "memories", "MEMORY.md"), "utf-8");
    expect(content).toBe("");
  });

  it("creates empty USER.md in memories/", async () => {
    await createHermesHome(tmpDir, agent, "Acme Corp", soulContent);
    const content = await fs.readFile(path.join(tmpDir, "content-writer", ".hermes", "memories", "USER.md"), "utf-8");
    expect(content).toBe("");
  });

  it("works with minimal agent config", async () => {
    const minimalAgent: AgentDef = {
      slug: "basic",
      name: "Basic Agent",
      role: "ceo",
      budget: 10,
      heartbeat: "0 9 * * *",
      toolsets: ["terminal"],
      internetTools: [],
      goals: ["Do things"],
    };
    await createHermesHome(tmpDir, minimalAgent, "Test Co", "# Personality\nYou are a leader.");
    const content = await fs.readFile(path.join(tmpDir, "basic", ".hermes", "SOUL.md"), "utf-8");
    expect(content).toContain("You are a leader.");
  });
});
