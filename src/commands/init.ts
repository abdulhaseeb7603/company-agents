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

const DASHBOARD_PORT = 3100;
const GATEWAY_PORT = 42617;

function getProjectName(): string {
  const cwd = process.cwd();
  return path.basename(cwd).replace(/[^a-z0-9-]/gi, "").toLowerCase() || "company-agents";
}

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
    provider,
    dashboardPort: DASHBOARD_PORT,
    gatewayPort: GATEWAY_PORT,
    publicUrl: deployTarget === "vps" ? `http://localhost:${DASHBOARD_PORT}` : undefined,
  });
  await fs.writeFile(".env", envContent, "utf-8");

  const composeContent = generateDockerCompose({
    dashboardPort: DASHBOARD_PORT,
    gatewayPort: GATEWAY_PORT,
    internetTools,
    enableSearxng,
    enableCaddy: deployTarget === "vps",
  });
  await fs.writeFile("docker-compose.yml", composeContent, "utf-8");

  spinner.succeed("Generated docker-compose.yml + .env");

  const homeSpinner = ora("Creating agent directories...").start();
  const personasDir = path.join(PACKAGE_ROOT, "personas");

  const roleMap: Record<string, string> = {
    ceo: "ceo.soul.md",
    cto: "cto.soul.md",
    cmo: "social-manager.soul.md",
    cfo: "cfo.soul.md",
    engineer: "engineer.soul.md",
    designer: "designer.soul.md",
    pm: "pm.soul.md",
    qa: "qa.soul.md",
    devops: "devops.soul.md",
    researcher: "researcher.soul.md",
    general: "content-writer.soul.md",
  };

  for (const agent of template.agents) {
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

  // Tear down previous deployment
  shelljs.exec("docker compose down -v 2>/dev/null", { silent: true });
  for (let i = 0; i < 5; i++) {
    let portInUse = false;
    if (process.platform === "win32") {
      const check = shelljs.exec(`netstat -ano | findstr :${GATEWAY_PORT}`, { silent: true });
      portInUse = check.stdout.trim() !== "";
    } else {
      const check = shelljs.exec(`lsof -ti:${GATEWAY_PORT} 2>/dev/null`, { silent: true });
      portInUse = check.stdout.trim() !== "";
      if (portInUse) {
        shelljs.exec(`lsof -ti:${GATEWAY_PORT} | xargs kill -9 2>/dev/null`, { silent: true });
      }
    }
    if (!portInUse) break;
    await new Promise(r => setTimeout(r, 1000));
  }

  const dockerSpinner = ora("Starting services...").start();
  const upResult = shelljs.exec("docker compose up -d --build", { silent: true });
  if (upResult.code !== 0) {
    dockerSpinner.fail("Docker compose failed");
    fatal(upResult.stderr || "Failed to start services");
  }
  dockerSpinner.succeed("Started Paperclip + OpenClaw stack");

  const apiUrl = `http://localhost:${DASHBOARD_PORT}`;
  const client = new PaperclipClient(apiUrl, "");

  const healthSpinner = ora("Waiting for Paperclip to be healthy...").start();
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
    shelljs.exec("docker compose logs paperclip --tail 20", { silent: false });
    fatal("Paperclip failed to start within 60 seconds.");
  }
  healthSpinner.succeed("Paperclip is healthy");

  const ocSpinner = ora("Waiting for OpenClaw gateway...").start();
  let ocHealthy = false;
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${GATEWAY_PORT}/`);
      if (res.ok) {
        ocHealthy = true;
        break;
      }
    } catch {
      // OpenClaw not ready yet
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  if (!ocHealthy) {
    ocSpinner.fail("OpenClaw gateway not responding");
    shelljs.exec("docker compose logs openclaw --tail 20", { silent: false });
    fatal("OpenClaw failed to start within 40 seconds.");
  }
  ocSpinner.succeed("OpenClaw gateway is ready");

  // Extract gateway auth token — use docker compose project name dynamically
  const tokenSpinner = ora("Reading OpenClaw gateway token...").start();
  let ocToken = "";
  try {
    const projectName = getProjectName();
    const containerName = `${projectName}-openclaw-1`;
    const configResult = shelljs.exec(
      `docker exec ${containerName} cat /openclaw-data/.openclaw/openclaw.json 2>/dev/null`,
      { silent: true }
    );
    if (configResult.code !== 0 || !configResult.stdout.trim()) {
      // Fallback: try docker compose exec
      const fallback = shelljs.exec(
        "docker compose exec -T openclaw cat /openclaw-data/.openclaw/openclaw.json 2>/dev/null",
        { silent: true }
      );
      if (fallback.stdout.trim()) {
        const config = JSON.parse(fallback.stdout) as { gateway?: { auth?: { token?: string } } };
        ocToken = config?.gateway?.auth?.token ?? "";
      }
    } else {
      const config = JSON.parse(configResult.stdout) as { gateway?: { auth?: { token?: string } } };
      ocToken = config?.gateway?.auth?.token ?? "";
    }
    if (ocToken) {
      tokenSpinner.succeed("OpenClaw gateway token acquired");
    } else {
      tokenSpinner.warn("Could not extract gateway token — agents may need manual config");
    }
  } catch {
    tokenSpinner.warn("OpenClaw token extraction skipped");
  }

  const seedSpinner = ora("Seeding company...").start();
  try {
    const result = await seedCompany(client, template, apiKey, ocToken, GATEWAY_PORT);
    seedSpinner.succeed("Seeded company, agents, org chart, goals");

    console.log(`\n  ${pc.green("\uD83C\uDF89")} Dashboard: ${pc.bold(apiUrl)}`);
    console.log(`     Agents: ${template.agents.map(a => a.name).join(", ")}`);
    console.log(`     Company: ${template.name}`);
    console.log(`     Company ID: ${result.companyId}\n`);
  } catch (error) {
    seedSpinner.fail("Seeding failed");
    shelljs.exec("docker compose logs --tail 10", { silent: false });
    fatal(error instanceof Error ? error.message : "Unknown seeding error");
  }
}
