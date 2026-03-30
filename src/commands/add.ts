import fs from "fs/promises";
import path from "path";
import inquirer from "inquirer";
import ora from "ora";
import pc from "picocolors";
import { PaperclipClient } from "../paperclip/client.js";
import { createAgentWorkspace } from "../generators/agent-workspace.js";
import { fatal } from "../utils/log.js";
import type { AgentDef } from "../schemas.js";

async function readEnvDefaults(): Promise<Record<string, string>> {
  try {
    const content = await fs.readFile(".env", "utf-8");
    const defaults: Record<string, string> = {};
    for (const line of content.split("\n")) {
      const match = line.match(/^([A-Z_]+)="?([^"]*)"?$/);
      if (match) defaults[match[1]] = match[2];
    }
    return defaults;
  } catch {
    return {};
  }
}

interface AddAnswers {
  name: string;
  slug: string;
  role: string;
  toolsets: string[];
  internetTools: string[];
  budget: number;
  heartbeat: string;
  goals: string;
}

export async function addCommand(companyId: string): Promise<void> {
  console.log(`\n  ${pc.bold("Add a new agent")}\n`);

  const envDefaults = await readEnvDefaults();

  const { companyName } = await inquirer.prompt<{ companyName: string }>([
    {
      type: "input",
      name: "companyName",
      message: "Company name:",
      validate: (v: string) => v.length > 0 || "Company name is required",
    },
  ]);

  const answers = await inquirer.prompt<AddAnswers>([
    {
      type: "input",
      name: "name",
      message: "Agent name:",
      validate: (v: string) => v.length > 0 || "Name is required",
    },
    {
      type: "input",
      name: "slug",
      message: "Agent slug (lowercase, hyphens):",
      validate: (v: string) => /^[a-z0-9-]+$/.test(v) || "Must be lowercase alphanumeric with hyphens",
    },
    {
      type: "list",
      name: "role",
      message: "Role:",
      choices: ["ceo", "cto", "cmo", "cfo", "engineer", "designer", "pm", "qa", "devops", "researcher", "general"],
    },
    {
      type: "checkbox",
      name: "toolsets",
      message: "Toolsets:",
      choices: [
        "terminal", "file", "web", "browser",
        "code_execution", "vision", "mcp",
        "image_gen", "tts", "todo", "cronjob", "memory",
      ],
      default: ["terminal", "file", "web"],
    },
    {
      type: "checkbox",
      name: "internetTools",
      message: "Internet tools:",
      choices: ["jina", "xreach", "yt-dlp", "searxng"],
    },
    {
      type: "number",
      name: "budget",
      message: "Monthly budget (USD dollars, 1-500):",
      default: 100,
      validate: (v: number) => (v >= 1 && v <= 500) || "Must be between 1 and 500",
    },
    {
      type: "input",
      name: "heartbeat",
      message: "Heartbeat cron (e.g. */30 * * * *):",
      default: "*/30 * * * *",
    },
    {
      type: "input",
      name: "goals",
      message: "Goals (comma-separated):",
      validate: (v: string) => v.trim().length > 0 || "At least one goal is required",
    },
  ]);

  const agentDef: AgentDef = {
    name: answers.name,
    slug: answers.slug,
    role: answers.role as AgentDef["role"],
    toolsets: answers.toolsets as AgentDef["toolsets"],
    internetTools: answers.internetTools as AgentDef["internetTools"],
    budget: answers.budget,
    heartbeat: answers.heartbeat,
    goals: answers.goals.split(",").map((g) => g.trim()).filter(Boolean),
  };

  const spinner = ora("Creating agent directory...").start();
  try {
    const soulContent = `# Personality\n\nYou are ${agentDef.name}.`;
    await createAgentWorkspace("./agents", agentDef, companyName, soulContent, {
      model: envDefaults["DEFAULT_MODEL"],
      provider: envDefaults["LLM_PROVIDER"],
    });
    spinner.succeed(`Created agent workspace at ${path.join("agents", agentDef.slug)}`);
  } catch (error) {
    spinner.fail("Failed to create agent directory");
    fatal(error instanceof Error ? error.message : "Unknown error");
  }

  const apiSpinner = ora("Registering agent with Paperclip...").start();
  try {
    const client = new PaperclipClient("http://localhost:3100", "");
    const created = await client.createAgent(companyId, {
      name: agentDef.name,
      role: agentDef.role,
      adapterType: "openclaw_gateway",
      adapterConfig: {
        url: "ws://127.0.0.1:42617/ws/chat",
        enabledToolsets: agentDef.toolsets,
        sessionKeyStrategy: "issue",
        autoPairOnFirstConnect: true,
      },
      budgetMonthlyCents: agentDef.budget * 100,
    });
    apiSpinner.succeed(`Agent registered: ${pc.bold(created.id)}`);
  } catch (error) {
    apiSpinner.fail("Failed to register agent with API");
    fatal(error instanceof Error ? error.message : "Unknown error");
  }

  console.log(`\n  ${pc.green("Done!")} Agent ${pc.bold(agentDef.name)} added.\n`);
}
