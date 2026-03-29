#!/usr/bin/env node
import { Command } from "commander";

const program = new Command();

program
  .name("hermesops")
  .description("Deploy Hermes Agent as business employees in Paperclip")
  .version("0.1.0");

program.parse();
