// Non-interactive init test — bypasses wizard prompts
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import shelljs from "shelljs";
import { generateDockerCompose } from "./src/generators/docker-compose.js";
import { generateEnv } from "./src/generators/env.js";
import { createAgentWorkspace } from "./src/generators/agent-workspace.js";
import { PaperclipClient } from "./src/paperclip/client.js";
import { seedCompany } from "./src/paperclip/seeder.js";
import type { CompanyTemplate } from "./src/schemas.js";

const API_KEY = "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";
const MODEL = "nvidia/nemotron-3-super-120b-a12b:free";

const template: CompanyTemplate = {
  name: "Content Agency",
  mission: "Produce high-quality content that drives engagement and growth",
  agents: [
    {
      slug: "agency-director",
      name: "Agency Director",
      role: "ceo",
      budget: 100,
      heartbeat: "0 9 * * 1-5",
      toolsets: ["terminal", "file", "web"],
      internetTools: ["jina"],
      goals: ["Review team output and assign priorities"],
    },
    {
      slug: "content-strategist",
      name: "Content Strategist",
      role: "researcher",
      budget: 80,
      heartbeat: "0 10 * * 1-5",
      toolsets: ["terminal", "file", "web", "browser"],
      internetTools: ["jina", "yt-dlp"],
      reportsTo: "agency-director",
      goals: ["Research trending topics in target industry", "Create content calendar for next week"],
    },
    {
      slug: "social-media-manager",
      name: "Social Media Manager",
      role: "cmo",
      budget: 60,
      heartbeat: "0 9,14 * * 1-5",
      toolsets: ["terminal", "file", "web", "browser"],
      internetTools: ["jina"],
      reportsTo: "agency-director",
      goals: ["Post 2x daily on Twitter", "Grow follower count by 10% monthly", "Monitor brand mentions and respond"],
    },
  ],
};

async function main() {
  console.log("=== Non-interactive init test ===\n");

  // 1. Generate .env
  const envContent = generateEnv({ apiKey: API_KEY, model: MODEL, dashboardPort: 3100 });
  await fs.writeFile(".env", envContent, "utf-8");
  console.log("✔ Generated .env");

  // 2. Generate docker-compose.yml
  const composeContent = generateDockerCompose({
    dashboardPort: 3100,
    internetTools: ["jina", "yt-dlp"],
    enableSearxng: true,
    enableCaddy: false,
  });
  await fs.writeFile("docker-compose.yml", composeContent, "utf-8");
  console.log("✔ Generated docker-compose.yml");

  // 3. Create agent workspaces
  for (const agent of template.agents) {
    const soul = `# Personality\n\nYou are ${agent.name}, the ${agent.role} at {{company_name}}.`;
    await createAgentWorkspace("./agents", agent, template.name, soul, { model: MODEL, provider: "openrouter" });
  }
  console.log(`✔ Created ${template.agents.length} agent workspaces`);

  // 4. Start Docker
  console.log("⏳ Starting Docker services...");
  const upResult = shelljs.exec("sudo docker compose up -d --build", { silent: false });
  if (upResult.code !== 0) {
    console.error("✖ Docker compose failed");
    process.exit(1);
  }
  console.log("✔ Docker compose up");

  // 5. Wait for Paperclip health
  console.log("⏳ Waiting for Paperclip...");
  const client = new PaperclipClient("http://127.0.0.1:3100", "");
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
    console.error("✖ Paperclip health check timeout");
    process.exit(1);
  }
  console.log("✔ Paperclip is healthy");

  // 6. Wait for OpenClaw gateway
  console.log("⏳ Waiting for OpenClaw gateway...");
  let zcHealthy = false;
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch("http://127.0.0.1:42617/");
      if (res.ok) {
        zcHealthy = true;
        break;
      }
    } catch {
      // not ready
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  if (!zcHealthy) {
    console.error("✖ OpenClaw gateway not responding");
    process.exit(1);
  }
  console.log("✔ OpenClaw gateway is ready");

  // 6.5. Extract OpenClaw gateway token
  console.log("⏳ Reading OpenClaw gateway token...");
  let ocToken = "";
  try {
    const configResult = shelljs.exec(
      "docker exec company-agents-openclaw-1 cat /openclaw-data/.openclaw/openclaw.json 2>/dev/null",
      { silent: true }
    );
    if (configResult.stdout.trim()) {
      const config = JSON.parse(configResult.stdout) as { gateway?: { token?: string } };
      ocToken = config?.gateway?.token ?? "";
    }
    if (ocToken) {
      console.log("✔ OpenClaw gateway token acquired");
    } else {
      console.log("⚠ Could not extract OpenClaw gateway token");
    }
  } catch {
    console.log("⚠ OpenClaw token extraction skipped");
  }

  // 7. Seed company
  console.log("⏳ Seeding company...");
  try {
    const result = await seedCompany(client, template, API_KEY, ocToken);
    console.log(`✔ Seeded company: ${template.name}`);
    console.log(`  Company ID: ${result.companyId}`);
    console.log(`  Agents: ${Object.keys(result.agentMap).join(", ")}`);
    console.log(`\n🎉 Dashboard: http://100.120.86.121:3100`);
  } catch (error) {
    console.error("✖ Seeding failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main().catch(console.error);
