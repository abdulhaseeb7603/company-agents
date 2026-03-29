import inquirer from "inquirer";
import shelljs from "shelljs";
import ora from "ora";
import pc from "picocolors";
import { fatal } from "../utils/log.js";

export async function destroyCommand(): Promise<void> {
  console.log(`\n  ${pc.red(pc.bold("WARNING:"))} This will destroy all containers, volumes, and data.\n`);

  const { first } = await inquirer.prompt<{ first: boolean }>([
    {
      type: "confirm",
      name: "first",
      message: "Are you sure you want to destroy everything?",
      default: false,
    },
  ]);

  if (!first) {
    console.log(pc.yellow("\nAborted.\n"));
    return;
  }

  const { second } = await inquirer.prompt<{ second: string }>([
    {
      type: "input",
      name: "second",
      message: 'Type "destroy" to confirm:',
    },
  ]);

  if (second !== "destroy") {
    console.log(pc.yellow("\nAborted.\n"));
    return;
  }

  const spinner = ora("Destroying all services and volumes...").start();
  const result = shelljs.exec("docker compose down -v", { silent: true });
  if (result.code !== 0) {
    spinner.fail("Failed to destroy services");
    fatal(result.stderr || "docker compose down -v failed");
  }
  spinner.succeed("All services and volumes destroyed");
}
