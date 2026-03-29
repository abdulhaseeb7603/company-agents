import pc from "picocolors";
import ora from "ora";
import { PaperclipClient } from "../paperclip/client.js";
import { fatal } from "../utils/log.js";

export async function listCommand(companyId: string): Promise<void> {
  const spinner = ora("Fetching agents...").start();

  try {
    const client = new PaperclipClient("http://localhost:3100", "");
    const agents = await client.listAgents(companyId);

    if (agents.length === 0) {
      spinner.succeed("No agents found");
      return;
    }

    spinner.succeed(`Found ${agents.length} agent(s):`);
    console.log("");
    console.log(
      `  ${pc.bold("Name".padEnd(25))} ${pc.bold("Role".padEnd(20))} ${pc.bold("Status".padEnd(15))} ${pc.bold("ID")}`
    );
    console.log(`  ${"─".repeat(80)}`);
    for (const agent of agents) {
      const statusColor = agent.status === "active" ? pc.green : pc.yellow;
      console.log(
        `  ${(agent.name ?? "").padEnd(25)} ${(agent.role ?? "").padEnd(20)} ${statusColor((agent.status ?? "unknown").padEnd(15))} ${agent.id}`
      );
    }
    console.log("");
  } catch (error) {
    spinner.fail("Failed to fetch agents");
    fatal(error instanceof Error ? error.message : "Unknown error");
  }
}
