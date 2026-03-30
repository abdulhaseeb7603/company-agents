import fs from "fs/promises";
import path from "path";
import type { AgentDef } from "../schemas.js";

interface AgentConfig {
  model?: string;
  provider?: string;
}

/**
 * Creates a ZeroClaw workspace directory for an agent.
 * Layout: baseDir/<slug>/.zeroclaw/workspace/
 */
export async function createAgentWorkspace(
  baseDir: string,
  agent: AgentDef,
  companyName: string,
  soulContent: string,
  config: AgentConfig = {}
): Promise<string> {
  const workspaceDir = path.join(baseDir, agent.slug, ".zeroclaw", "workspace");
  const configDir = path.join(baseDir, agent.slug, ".zeroclaw");

  await fs.mkdir(workspaceDir, { recursive: true });

  // IDENTITY.md — who the agent is
  const identity = [
    `**Name**: ${agent.name}`,
    `**Role**: ${agent.role}`,
    `**Organization**: ${companyName}`,
    "",
    "## About",
    "",
    `${agent.name} is a ${agent.role} at ${companyName}.`,
  ].join("\n");
  await fs.writeFile(path.join(workspaceDir, "IDENTITY.md"), identity, "utf-8");

  // SOUL.md — how the agent behaves
  const soul = soulContent.replaceAll("{{company_name}}", companyName);
  await fs.writeFile(path.join(workspaceDir, "SOUL.md"), soul, "utf-8");

  // MEMORY.md — empty, agent populates over time
  await fs.writeFile(path.join(workspaceDir, "MEMORY.md"), "", "utf-8");

  // USER.md — empty, agent populates over time
  await fs.writeFile(path.join(workspaceDir, "USER.md"), "", "utf-8");

  // config.toml — ZeroClaw configuration
  const model = config.model ?? "anthropic/claude-sonnet-4";
  const provider = config.provider ?? "openrouter";

  const configToml = [
    `default_provider = "${provider}"`,
    `default_model = "${model}"`,
    "",
    "[memory]",
    'backend = "sqlite"',
    "auto_save = true",
    "",
    "[autonomy]",
    'level = "full"',
    "",
    "[gateway]",
    "port = 42617",
  ].join("\n");

  await fs.writeFile(path.join(configDir, "config.toml"), configToml, "utf-8");

  return configDir;
}
