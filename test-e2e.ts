/**
 * End-to-end test: runs init flow programmatically (no interactive prompts)
 */
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import shelljs from "shelljs";
import { generateDockerCompose } from "./src/generators/docker-compose.js";
import { generateEnv } from "./src/generators/env.js";
import { createAgentWorkspace } from "./src/generators/agent-workspace.js";
import { PaperclipClient } from "./src/paperclip/client.js";
import { seedCompany } from "./src/paperclip/seeder.js";
import { CompanyTemplateSchema } from "./src/schemas.js";
import YAML from "yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const API_KEY = "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";
  const MODEL = "nvidia/nemotron-3-super-120b-a12b:free";
  const PROVIDER = "openrouter";

  console.log("=== E2E Test: Company Agents ===\n");

  // 1. Generate .env
  const envContent = generateEnv({ apiKey: API_KEY, model: MODEL, dashboardPort: 3100 });
  await fs.writeFile(".env", envContent, "utf-8");
  console.log("✓ Generated .env");

  // 2. Generate docker-compose.yml
  const composeContent = generateDockerCompose({
    dashboardPort: 3100,
    internetTools: ["jina", "yt-dlp"],
    enableSearxng: true,
    enableCaddy: false,
  });
  await fs.writeFile("docker-compose.yml", composeContent, "utf-8");
  console.log("✓ Generated docker-compose.yml");

  // 3. Load template
  const templateRaw = await fs.readFile(path.join(__dirname, "templates", "content-agency.yaml"), "utf-8");
  const template = CompanyTemplateSchema.parse(YAML.parse(templateRaw));
  console.log(`✓ Loaded template: ${template.name} (${template.agents.length} agents)`);

  // 4. Create agent workspaces
  for (const agent of template.agents) {
    const soulContent = `# Personality\n\nYou are ${agent.name} at ${template.name}.`;
    await createAgentWorkspace("./agents", agent, template.name, soulContent, { model: MODEL, provider: PROVIDER });
  }
  console.log(`✓ Created ${template.agents.length} agent workspaces`);

  // 5. Start Docker
  console.log("Starting Docker containers...");
  const upResult = shelljs.exec("sudo docker compose up -d --build", { silent: true });
  if (upResult.code !== 0) {
    console.error("✗ Docker compose failed:", upResult.stderr);
    process.exit(1);
  }
  console.log("✓ Docker containers started");

  // 6. Wait for health
  const client = new PaperclipClient("http://127.0.0.1:3100", "");
  console.log("Waiting for Paperclip health...");
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
    console.error("✗ Paperclip health check timeout");
    shelljs.exec("sudo docker compose logs paperclip | tail -20");
    process.exit(1);
  }
  console.log("✓ Paperclip is healthy");

  // 7. Seed company
  console.log("Seeding company...");
  try {
    const result = await seedCompany(client, template, API_KEY);
    console.log(`✓ Seeded company: ${template.name}`);
    console.log(`  Company ID: ${result.companyId}`);
    console.log(`  Agents: ${Object.keys(result.agentMap).join(", ")}`);
  } catch (error) {
    console.error("✗ Seeding failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  }

  // 8. Verify
  console.log("\n=== Verification ===");
  const healthResult = await client.healthCheck();
  console.log(`Health: ${JSON.stringify(healthResult)}`);

  console.log("\n🎉 E2E TEST PASSED — all systems go!");
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
