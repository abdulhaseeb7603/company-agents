import fs from "fs/promises";
import path from "path";
import type { AgentDef } from "../schemas.js";

interface HermesConfig {
  model?: string;
  provider?: string;
}

export async function createHermesHome(
  baseDir: string,
  agent: AgentDef,
  companyName: string,
  soulContent: string,
  config: HermesConfig = {}
): Promise<string> {
  const hermesDir = path.join(baseDir, agent.slug, ".hermes");

  await fs.mkdir(path.join(hermesDir, "memories"), { recursive: true });
  await fs.mkdir(path.join(hermesDir, "skills"), { recursive: true });
  await fs.mkdir(path.join(hermesDir, "sessions"), { recursive: true });

  const soul = soulContent.replaceAll("{{company_name}}", companyName);
  await fs.writeFile(path.join(hermesDir, "SOUL.md"), soul, "utf-8");

  const model = config.model ?? "anthropic/claude-sonnet-4";
  const provider = config.provider ?? "openrouter";

  const configYaml = [
    `model: ${model}`,
    `provider: ${provider}`,
    "terminal:",
    "  backend: local",
    "memory:",
    "  memory_enabled: true",
    "  user_profile_enabled: true",
  ].join("\n");

  await fs.writeFile(path.join(hermesDir, "config.yaml"), configYaml, "utf-8");

  await fs.writeFile(path.join(hermesDir, "memories", "MEMORY.md"), "", "utf-8");
  await fs.writeFile(path.join(hermesDir, "memories", "USER.md"), "", "utf-8");

  return hermesDir;
}
