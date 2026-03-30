import fs from "fs/promises";
import path from "path";
import inquirer from "inquirer";
import ora from "ora";
import pc from "picocolors";
import { fatal } from "../utils/log.js";

export async function removeCommand(slug: string): Promise<void> {
  const agentDir = path.resolve("agents", slug);
  const expectedBase = path.resolve("agents");
  if (!agentDir.startsWith(expectedBase + path.sep) && agentDir !== expectedBase) {
    fatal(`Invalid slug: "${slug}" resolves outside the agents directory.`);
  }

  try {
    await fs.access(agentDir);
  } catch {
    fatal(`Agent directory not found: ${agentDir}`);
  }

  const { confirmed } = await inquirer.prompt<{ confirmed: boolean }>([
    {
      type: "confirm",
      name: "confirmed",
      message: `Remove agent "${slug}" and delete ${agentDir}?`,
      default: false,
    },
  ]);

  if (!confirmed) {
    console.log(pc.yellow("\nAborted.\n"));
    return;
  }

  const spinner = ora(`Removing ${slug}...`).start();
  try {
    await fs.rm(agentDir, { recursive: true, force: true });
    spinner.succeed(`Removed agent directory: ${agentDir}`);
    console.log(pc.yellow(`\n  Note: The agent "${slug}" may still exist in Paperclip.\n  Use the Paperclip dashboard to fully remove it from the API.\n`));
  } catch (error) {
    spinner.fail("Failed to remove agent directory");
    fatal(error instanceof Error ? error.message : "Unknown error");
  }
}
