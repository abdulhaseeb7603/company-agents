#!/usr/bin/env node
import { Command } from "commander";
import { initCommand } from "./commands/init.js";
import { statusCommand } from "./commands/status.js";
import { listCommand } from "./commands/list.js";
import { logsCommand } from "./commands/logs.js";
import { addCommand } from "./commands/add.js";
import { removeCommand } from "./commands/remove.js";
import { updateCommand } from "./commands/update.js";
import { destroyCommand } from "./commands/destroy.js";
import { doctorCommand } from "./commands/doctor.js";
import { deployCommand } from "./commands/deploy.js";

const program = new Command();

program
  .name("company-agents")
  .description("Deploy Hermes Agent as business employees in Paperclip")
  .version("0.1.0");

program
  .command("init")
  .description("Setup wizard — create a new Company Agents project")
  .action(initCommand);

program
  .command("status")
  .description("Show status of Docker services and Paperclip health")
  .action(statusCommand);

program
  .command("list")
  .argument("<companyId>", "Company ID")
  .description("List agents for a company")
  .action(listCommand);

program
  .command("logs")
  .argument("<agent>", "Agent slug")
  .description("Show recent logs for an agent")
  .action(logsCommand);

program
  .command("add")
  .argument("<companyId>", "Company ID")
  .description("Interactive wizard to add a new agent")
  .action(addCommand);

program
  .command("remove")
  .argument("<slug>", "Agent slug")
  .description("Remove an agent directory")
  .action(removeCommand);

program
  .command("update")
  .description("Pull latest images and restart services")
  .action(updateCommand);

program
  .command("destroy")
  .description("Destroy all containers, volumes, and data")
  .action(destroyCommand);

program
  .command("doctor")
  .description("Check system health and prerequisites")
  .action(doctorCommand);

program
  .command("deploy")
  .description("Push to VPS via SSH + Caddy auto-SSL")
  .action(deployCommand);

// Default: run init when invoked as npx create-company-agents
if (process.argv.length <= 2) {
  initCommand();
} else {
  program.parse();
}
