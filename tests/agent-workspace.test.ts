import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { createAgentWorkspace } from "../src/generators/agent-workspace.js";
import type { AgentDef } from "../src/schemas.js";

describe("createAgentWorkspace", () => {
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

  const soulContent = "# Personality\n\nYou are a content strategist at {{company_name}}.";

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "company-agents-test-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("creates the correct OpenClaw directory structure", async () => {
    await createAgentWorkspace(tmpDir, agent, "Acme Corp", soulContent);
    const zcDir = path.join(tmpDir, "content-writer", ".openclaw");
    const wsDir = path.join(zcDir, "workspace");
    expect((await fs.stat(zcDir)).isDirectory()).toBe(true);
    expect((await fs.stat(wsDir)).isDirectory()).toBe(true);
  });

  it("writes IDENTITY.md with agent name and role", async () => {
    await createAgentWorkspace(tmpDir, agent, "Acme Corp", soulContent);
    const content = await fs.readFile(
      path.join(tmpDir, "content-writer", ".openclaw", "workspace", "IDENTITY.md"), "utf-8"
    );
    expect(content).toContain("Content Writer");
    expect(content).toContain("Acme Corp");
    expect(content).toContain("content");
  });

  it("writes SOUL.md with company name replaced", async () => {
    await createAgentWorkspace(tmpDir, agent, "Acme Corp", soulContent);
    const content = await fs.readFile(
      path.join(tmpDir, "content-writer", ".openclaw", "workspace", "SOUL.md"), "utf-8"
    );
    expect(content).toContain("Acme Corp");
    expect(content).not.toContain("{{company_name}}");
  });

  it("writes config.toml with correct model and provider", async () => {
    await createAgentWorkspace(tmpDir, agent, "Acme Corp", soulContent, {
      model: "anthropic/claude-sonnet-4",
      provider: "openrouter",
    });
    const content = await fs.readFile(
      path.join(tmpDir, "content-writer", ".openclaw", "config.toml"), "utf-8"
    );
    expect(content).toContain("anthropic/claude-sonnet-4");
    expect(content).toContain("openrouter");
  });

  it("creates empty MEMORY.md and USER.md", async () => {
    await createAgentWorkspace(tmpDir, agent, "Acme Corp", soulContent);
    const wsDir = path.join(tmpDir, "content-writer", ".openclaw", "workspace");
    const memory = await fs.readFile(path.join(wsDir, "MEMORY.md"), "utf-8");
    const user = await fs.readFile(path.join(wsDir, "USER.md"), "utf-8");
    expect(memory).toBe("");
    expect(user).toBe("");
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
    await createAgentWorkspace(tmpDir, minimalAgent, "Test Co", "# Personality\nYou are a leader.");
    const content = await fs.readFile(
      path.join(tmpDir, "basic", ".openclaw", "workspace", "SOUL.md"), "utf-8"
    );
    expect(content).toContain("You are a leader.");
  });
});
