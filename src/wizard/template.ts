import inquirer from "inquirer";
import fs from "fs/promises";
import path from "path";
import YAML from "yaml";
import { CompanyTemplateSchema } from "../schemas.js";
import type { CompanyTemplate } from "../schemas.js";

export async function promptTemplate(templatesDir: string): Promise<CompanyTemplate> {
  const files = await fs.readdir(templatesDir);
  const yamlFiles = files.filter(f => f.endsWith(".yaml"));

  const choices = [];
  for (const file of yamlFiles) {
    const content = await fs.readFile(path.join(templatesDir, file), "utf-8");
    const parsed = YAML.parse(content);
    const agentCount = parsed.agents?.length ?? 0;
    const roles = parsed.agents?.map((a: { name: string }) => a.name).join(", ") ?? "";
    choices.push({
      name: `${parsed.name} (${agentCount} agents: ${roles})`,
      value: file,
    });
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
