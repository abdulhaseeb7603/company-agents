import inquirer from "inquirer";
import fs from "fs/promises";
import path from "path";
import pc from "picocolors";
import YAML from "yaml";
import { CompanyTemplateSchema } from "../schemas.js";
import { fatal } from "../utils/log.js";
import type { CompanyTemplate } from "../schemas.js";

export async function promptTemplate(templatesDir: string): Promise<CompanyTemplate> {
  const files = await fs.readdir(templatesDir);
  const yamlFiles = files.filter(f => f.endsWith(".yaml"));

  if (yamlFiles.length === 0) {
    fatal(`No template files found in ${templatesDir}. Add a .yaml template and try again.`);
  }

  const choices = [];
  for (const file of yamlFiles) {
    try {
      const content = await fs.readFile(path.join(templatesDir, file), "utf-8");
      const parsed = YAML.parse(content);
      const agentCount = parsed.agents?.length ?? 0;
      const roles = parsed.agents?.map((a: { name: string }) => a.name).join(", ") ?? "";
      choices.push({
        name: `${parsed.name} (${agentCount} agents: ${roles})`,
        value: file,
      });
    } catch (err) {
      console.warn(pc.yellow(`Warning: skipping invalid template ${file}: ${err instanceof Error ? err.message : String(err)}`));
    }
  }

  if (choices.length === 0) {
    fatal("All template files failed to parse. Fix your YAML templates and try again.");
  }

  const { templateFile } = await inquirer.prompt([
    {
      type: "list",
      name: "templateFile",
      message: "Company template:",
      choices,
    },
  ]);

  const raw = await fs.readFile(path.join(templatesDir, templateFile), "utf-8");
  const parsed = YAML.parse(raw);
  const validated = CompanyTemplateSchema.parse(parsed);
  return validated;
}
