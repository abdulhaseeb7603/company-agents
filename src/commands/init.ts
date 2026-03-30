import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import shelljs from "shelljs";
import ora from "ora";
import pc from "picocolors";
import { promptDeployTarget } from "../wizard/deploy-target.js";
import { promptProvider } from "../wizard/provider.js";
import { promptTemplate } from "../wizard/template.js";
import { promptInternetTools } from "../wizard/internet.js";
import { generateDockerCompose } from "../generators/docker-compose.js";
import { generateEnv } from "../generators/env.js";
import { createAgentWorkspace } from "../generators/agent-workspace.js";
import { PaperclipClient } from "../paperclip/client.js";
import { seedCompany } from "../paperclip/seeder.js";
import { fatal } from "../utils/log.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(__dirname, "..", "..");

export async function initCommand(): Promise<void> {
  console.log(`\n  ${pc.bold("\u26A1 Company Agents")} \u2014 Business Agents for Paperclip\n`);

  const deployTarget = await promptDeployTarget();
  const { provider, apiKey, model } = await promptProvider();
  const templatesDir = path.join(PACKAGE_ROOT, "templates");
  const template = await promptTemplate(templatesDir);
  const { tools: internetTools, enableSearxng } = await promptInternetTools();

  const dockerCheck = shelljs.exec("docker info", { silent: true });
  if (dockerCheck.code !== 0) {
    fatal("Docker is not running. Start Docker and try again.");
  }

  const spinner = ora("Generating configuration...").start();

  const envContent = generateEnv({
    apiKey,
    model,
    dashboardPort: 3100,
    publicUrl: deployTarget === "vps" ? "http://localhost:3100" : "http://localhost:3100",
  });
  await fs.writeFile(".env", envContent, "utf-8");

  const composeContent = generateDockerCompose({
    dashboardPort: 3100,
    internetTools,
    enableSearxng,
    enableCaddy: deployTarget === "vps",
  });
  await fs.writeFile("docker-compose.yml", composeContent, "utf-8");

  spinner.succeed("Generated docker-compose.yml (hardened)");

  const homeSpinner = ora("Creating agent directories...").start();
  const personasDir = path.join(PACKAGE_ROOT, "personas");

  for (const agent of template.agents) {
    const roleMap: Record<string, string> = {
      ceo: "ceo.soul.md",
      content: "content-writer.soul.md",
      social: "social-manager.soul.md",
      research: "researcher.soul.md",
      outreach: "outreach.soul.md",
    };
    const soulFile = agent.soulTemplate ?? roleMap[agent.role];
    let soulContent: string;
    if (soulFile) {
      try {
        soulContent = await fs.readFile(path.join(personasDir, soulFile), "utf-8");
      } catch {
        soulContent = `# Personality\n\nYou are ${agent.name}, the ${agent.role} at {{company_name}}.`;
      }
    } else {
      soulContent = `# Personality\n\nYou are ${agent.name}, the ${agent.role} at {{company_name}}.`;
    }
    await createAgentWorkspace("./agents", agent, template.name, soulContent, {
      model,
      provider,
    });
  }
  homeSpinner.succeed(`Created ${template.agents.length} agent workspaces`);

  const dockerSpinner = ora("Starting services...").start();
  const upResult = shelljs.exec("docker compose up -d --build", { silent: true });
  if (upResult.code !== 0) {
    dockerSpinner.fail("Docker compose failed");
    fatal(upResult.stderr || "Failed to start services");
  }
  dockerSpinner.succeed("Started Paperclip + ZeroClaw stack");

  const healthSpinner = ora("Waiting for Paperclip to be healthy...").start();
  const apiUrl = "http://localhost:3100";
  const client = new PaperclipClient(apiUrl, "");

  let healthy = false;
  for (let i = 0; i < 30; i++) {
    try {
      await client.healthCheck();
      healthy = true;
      break;
    } catch {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  if (!healthy) {
    healthSpinner.fail("Paperclip health check timeout");
    fatal("Paperclip failed to start within 60 seconds. Run: docker compose logs paperclip");
  }
  healthSpinner.succeed("Paperclip is healthy");

  const seedSpinner = ora("Seeding company...").start();
  try {
    const result = await seedCompany(client, template, apiKey);
    seedSpinner.succeed("Seeded company, agents, org chart, goals");

    console.log(`\n  ${pc.green("\uD83C\uDF89")} Dashboard: ${pc.bold(`${apiUrl}`)}`);
    console.log(`     Agents: ${template.agents.map(a => a.name).join(", ")}`);
    console.log(`     Company: ${template.name}`);
    console.log(`     Company ID: ${result.companyId}\n`);
  } catch (error) {
    seedSpinner.fail("Seeding failed");
    fatal(error instanceof Error ? error.message : "Unknown seeding error");
  }
}
