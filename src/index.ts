#!/usr/bin/env node
import { Command } from "commander";
import { initCommand } from "./commands/init.js";

const program = new Command();

program
  .name("hermesops")
  .description("Deploy Hermes Agent as business employees in Paperclip")
  .version("0.1.0");

program
  .command("init")
  .description("Setup wizard \u2014 create a new HermesOps project")
  .action(initCommand);

// Default: run init when invoked as npx create-hermesops
if (process.argv.length <= 2) {
  initCommand();
} else {
  program.parse();
}
